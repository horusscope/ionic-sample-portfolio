angular.module('kargoe.cameraService', [])

.factory('postCrud', function($q, $localStorage, $cordovaCamera, APP_CONFIG, $state, $timeout, functions, API, animate, Camera, $rootScope) {
    AWS.config.update({
        accessKeyId: APP_CONFIG.AWSKey,
        secretAccessKey: APP_CONFIG.AWSSecret,
        region: APP_CONFIG.AWSRegion
    });
    if(!$localStorage.S3) $localStorage.S3 = { };
    var userid = $localStorage.User.UserId;
    var bucket = null;
    function S3( ) {
        if(!bucket && $localStorage.S3.bucket) {
            bucket = new AWS.S3({params: {Bucket: $localStorage.S3.bucket}});
            return bucket;
        } else if(!bucket) {
            console.log("S3 bucket is undefined, unable to post.");
            return false;
        } else return bucket;
    }
  // Having plugins loaded is sufficiently mobile for our interpret and compile in all phases
    function isMobile( ) { return typeof window.plugins !== 'undefined' }
    
    /* onImg is from function service, which provides abstract generics */
    this.onImg = function(src, callback) {
        var img = document.createElement("img");
        img.onerror = function( ) { callback(false) }
        img.onload = function( ) { callback(img) }
        img.crossOrigin = "Anonymous";
        img.src = src;
    };
    function makeThumb(DataURI) {
        return new Promise(function(resolve, reject) {
            if(!S3( )) reject(DataURI);
            functions.onImg(DataURI, function(img) {
                if(!img) reject(DataURI);
                var AR = img.width / img.height;
                resolve(functions.resize(
                    img, {w: 480, h: 480 / AR}
                ));
            });
        });
    }
    postCrud.updateAvatar = function( DataURI, CropArea, scope ) {
        if(!S3( )) return false;
        functions.onImg(DataURI, function(img){
            // canvas to image ratio
            var ratio = CropArea._ctx.canvas.width / img.width;
            // crop size and position
            var dim = { // the croparea canvas size is not the same as src
                w: CropArea._size / ratio,  // width in src
                // x and y are returned as a center point, relative to canvas
                // convert them to a top/left and size relative src image
                x: (CropArea._x - CropArea._size/2) / ratio,
                y: (CropArea._y - CropArea._size/2) / ratio
            };
            // crop [literal cut] out the selected area and save it
            var original = functions.crop(
                img, { w: dim.w, h: dim.w, x: dim.x, y: dim.y }
            );
            var thumb = functions.crop(
                img, {  w: dim.w, h: dim.w,
                        x: dim.x, y: dim.y,
                        dw: 200, dh: 200 // also resize
                     }
            );
            API.do('Users', 'avatar')
            .then(function(secure) {
                Promise.all([
                    prepareUpload( secure.avatar, thumb, false, 300, true, true/*forceForeground*/ ),
                    prepareUpload( secure.avatarOrig, original, false, 300, true, true/*forceForeground*/ )
                ]).then(function( ) {
                    if(scope) {
                        if(scope.version) ++scope.version;
                        else scope.version = 1;
                        scope.now = Date.now( )
                        $timeout(function( ) { });
                    } else $state.go('profile', { userId: $localStorage.User.UserId });
                });
            }).catch(function(err) {
                console.log(err);
                if(scope) scope.version = false;
                else $state.go('profile', { userId: $localStorage.User.UserId });
            });
        });
    }
  // This is called twice, once for the full res video and again for the small res [both mp4]
  function FSVidToData( URL ) {
    // read from [F]ile[S]ystem to array of bytes
    function fileChunked ( resolve, reject ) {
      // after translating an app ios tmp addr to url, get permission and a sys valid ptr to file
      function handleFilePointer ( fileEntry ) {
        function file( f ) { // we have a file object now and we're doing something
          function complete( ){resolve(  this.reader.result  )} // resolves [totally out of scope FSVidToData( )]
          this .reader = new FileReader ( ) // native driver
          this .reader .readAsArrayBuffer ( f )
          this .reader .onloadend = complete .bind ( this ) // RESOLVE .
        }
        function unzip ( f ) { new file ( f ) } // we got a PTR to FILE* from a file:/// thing!
        fileEntry .file ( unzip ) // take it apart into an array so we can upload it to s3 videos
      }
      function readError ( error ) { reject(new Error(JSON.stringify(error))) }

      window.resolveLocalFileSystemURL( URL, handleFilePointer, readError )
    }

    return new Promise ( fileChunked )
  }
    // Params for images and videos are fairly constant.
    function imgParams( name, data, fullname, exp, revalidate ) {
        exp = exp || 86400;
        return {
            Key: name + (fullname? "": ".jpg"),
            ContentType: "image/jpeg",
            ContentEncoding: 'base64',
            ContentLength: 0,
            Body: postCrud.getBlob(data),
            ACL: "public-read",
            CacheControl:  revalidate ? "must-revalidate" : "max-age="+exp // seconds
        };
    }
    function vidParams( name, data, fullname ) {
        return {
            Key: name + (fullname? "" : ".mp4"),
            ContentType: "video/mp4",
            Body: data, // already formatted
            ACL: "public-read",
            CacheControl:  "max-age=86400" // one day
        };
    }

  var options = { partSize: 10 * 1024 * 1024, queueSize: 1 }
  function upload( params ) { // vidParams( ) or imgParams( )
    function up ( resolve, reject ) {
      if(!S3( )) reject(new Error('Amazon S3>js:(library< \'public cloud access drivers\') not found.'))
      function resp( error, data ) { error
                                   ? reject ( new Error(JSON.stringify(error)) )
                                   : resolve ( data )
                                   }
      bucket .upload ( params, options, resp )
    }
    return new Promise ( up )
  }
  function setSignedParams(params, signing) {
    params['X-Amz-Content-Sha256'] = signing['X-Amz-Content-Sha256']
    params['X-Amz-Algorithm'] = signing['X-Amz-Algorithm']
    params['X-Amz-Credential'] = signing['X-Amz-Credential']
    params['X-Amz-Date'] = signing['X-Amz-Date']
    params['X-Amz-SignedHeaders'] = signing['X-Amz-SignedHeaders']
    params['X-Amz-Expires'] = signing['X-Amz-Expires']
    params['X-Amz-Signature'] = signing['X-Amz-Signature']
    return params
  }
  function prepareUpload( secure, payload, video, exp, revalidate, forceForeground ) {
    function uploadData(resolve, reject) {
      if(!isMobile( )) forceForeground = true
      var payloadNoPrefix = video ? 0 : payload.replace('data:image/jpeg;base64,', '')
        , func = video? vidParams : imgParams
        , params = func(secure['_filename'], payload, true, exp, revalidate)
      if (forceForeground /* !video*/) {
        var req = new XMLHttpRequest( )
        req.open('PUT', secure['_url'], true)
        req.setRequestHeader('Content-Type', params.ContentType)
        req.setRequestHeader('Cache-Control', params.CacheControl)
        if(params.ContentEncoding)
          req.setRequestHeader('Content-Encoding', params.ContentEncoding)
        req.onload = function( ) {
          if(req.readyState === 4)
            // req.status === 200 ???
            resolve(true)
        }
        req.ontimeout = function( ) {
          reject('upload timed out')
        }
        req.onerror = function( ) {
          reject('upload error occurred: '+req.statusText)
        }
        req.send(params.Body)
      } else if(window.plugins && window.plugins.bundleIdentifier) { // trial for movie upload background
        var filetowrite
        if( window.plugins.vidFilesToPost ) // need to mod this for new queued way (TO DO)
          filetowrite = window.plugins.vidFilesToPost.movieUrlAsNSString

        // need to use orig, we had a shortcut from 3d cam, no rendering req'd
        if(filetowrite === 'usePreview' && video) {
          alert("caution, usePreview may not be fully supported yet for queued upload")
          filetowrite = uint8ToBase64(new Uint8Array(params.Body))
        }
        if(!video) filetowrite = payloadNoPrefix // works!
        window.plugins.bundleIdentifier.get([ 'backgroundUpload'
                                            , filetowrite
                                            , secure['_url']
                                            , video ? '1' : '0'
                                            , params.Key
                                            ]
                                           , function( ) { }
                                           , function( ) { }
                                           )
        resolve(true)
      } else reject('no valid upload method available')
    }
    return new Promise(uploadData)
  }
  postCrud.upload = prepareUpload

  postCrud.getBlob = function(dataURI){
    var binary = atob(dataURI.split(',')[1])
      , array = [ ]
      , mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
    for(var i = 0; i < binary.length; i++)
      array.push(binary.charCodeAt(i))
    var outvar = new Blob([new Uint8Array(array)], {type: mimeString})
    return outvar;
  }
  return postCrud
})
