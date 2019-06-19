angular.module('kargoe.interpreter', [])
.service('functions', function(animate, $localStorage) {
    var self = this;
    this.w = window.innerWidth;
    this.h = window.innerHeight;

    this.distance = function(a, b) {
        return Math.sqrt( Math.pow(b.x-a.x,2) + Math.pow(b.y-a.y,2) );
    };
    this.touchOrigin = function(touches, boundingElement) {
        // calculate average middle point (original, current)
        var center = { x: 0, y: 0, sum: 0 };
        var perimeter = { sum: 0, first: null, last: null };
        for(var o in touches) {
            // origin
            var touch = touches[o];
            center.sum ++;
            center.x += touch.x;
            center.y += touch.y;

            // perimeter
            if(!perimeter.first)  perimeter.first = touch;
            if(perimeter.last)    perimeter.sum += self.distance(perimeter.last, touch);
            perimeter.last = touch;
        }
        perimeter.sum += self.distance(perimeter.last, perimeter.first); // close loop
        center.perimeter = perimeter.sum;
        if(center.sum > 1) {
            center.x /= center.sum;
            center.y /= center.sum;
        }
        var bounds = boundingElement.getBoundingClientRect( );
        center.offset = { // deviate of image placement (size is volatile, must ignore)
            top: (center.y - bounds.top) / (bounds.bottom-bounds.top),
            left: (center.x - bounds.left) / (bounds.right-bounds.left)
        };

        return center;
    };



    this.canvas = document.createElement("canvas"); // service local canvas
    this.ctx = self.canvas.getContext("2d"); // service local canvas context
    this.resize = function(img, dim, q, MIME) {
        // this rhetorical looking initialization allows us to
        // convert a localhost png file to 0.8q jpeg with 0 arguments
        if(!dim) dim = { };
        dim.w = dim.w || img.width;
        dim.h = dim.h || img.height;
        self.canvas.width = dim.w;
        self.canvas.height = dim.h;
        self.ctx.drawImage(img, 0, 0, dim.w, dim.h);
        return MIME
            ? self.canvas.toDataURL(MIME)
            : self.canvas.toDataURL('image/jpeg', q ? q : 0.8);
    };
    this.crop = function(img, dim, q) {
        self.canvas.width = dim.dw ? dim.dw : dim.w;
        self.canvas.height = dim.dh ? dim.dh : dim.h;
        // srcElement, srcOriginX, srcOriginY, srcW, srcH, dstOriginX, dstOriginY, dstW, dstH [bitblt]
        self.ctx.drawImage(img, dim.x, dim.y, dim.w, dim.h, dim.dx ? dim.dx : 0, dim.dy? dim.dy : 0, dim.dw? dim.dw : dim.w, dim.dh? dim.dh : dim.h);
        return self.canvas.toDataURL('image/jpeg', q ? q : 0.8);
    };


    this.googleAlias = {
        street_number: "StreetNumber",
        route: "Street",
        subpremise: "Apt",
        sublocality: "City",
        locality: "City",
        administrative_area_level_1: "State",
        country: "Country",
        postal_code: "Zip"
    };
    this.googleParts = function(parts) {
        var map = self.googleAlias;
        return parts.reduce(function(stack, part) {
            var match = part.types.find(function(e) { return map[e] });
            if(match) stack[map[match]] = part.short_name;
            return stack;
        }, { });
    };
    this.googlePoint = function(point) {
        var parts = self.googleParts(point.address_components);
        parts.ID = point.place_id;
        parts.Brand = point.name;
        parts.Name = point.name;
        parts.Geo = point.geometry.location;
        parts.Img = point.icon;
        parts.fmt = parts.StreetNumber+" "+parts.Street+(parts.Apt? (" "+parts.Apt) : "")
                    +", "+parts.City+", "+parts.State+" "+parts.Zip;
        return parts;
    }
    this.geocoder = new google.maps.Geocoder( );
    this.places = new google.maps.places.PlacesService(document.createElement('div'));
    this.translateZip = function(zip, enforceCommas) {
        var address = zip;
        if(typeof address === 'number') address = address.toString( );
        return new Promise(function(resolve, reject) {
            self.geocoder.geocode({ 'address': address }, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    if(enforceCommas && results[0].formatted_address.match(/,/g).length < 3)
                        reject("Malformed address returned.");
                    // validate address components
                    resolve({
                        latLng: {
                            lat: results[0].geometry.location.lat( ),
                            lng: results[0].geometry.location.lng( )
                        },
                        parts: self.googleParts(results[0].address_components)
                    });
                } else reject("Invalid zipcode provided.");
            });
        })
    }
    this.watching = null;
    this.watchPosition = function(callback) {
        self.watching = navigator.geolocation.watchPosition(
        function(success) {
            callback({
                lat: success.coords.latitude,
                lng: success.coords.longitude
            })
        }, function(error) {
            console.log(error);
        });
    }
    this.stopWatchingPosition = function( ) {
        if(self.watching !== null) {
            navigator.geolocation.clearWatch(self.watching);
            self.watching = null;
        }
    }
    this.approxPosition = function( ) {
        return new Promise(function(resolve, reject) {
            function fallback( ) {
                $.getScript('//www.google.com/jsapi', function( ) {
                    // ClientLocation may be 'null'
                    if (google.loader.ClientLocation)
                        resolve({   lat: google.loader.ClientLocation.latitude,
                                    lng: google.loader.ClientLocation.longitude });
                    else reject(false);
                });
            }
            if(navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(pos) {
                    resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                }, fallback, { timeout: 5000 });
            } else fallback( );
        });
    }
    this.map = function(elem, config) {
        return (function(elem, config) {
            var settings = {
                zoom: 2,
                center: {lat: 40, lng: -75},
                mapTypeId: google.maps.MapTypeId.ROADMAP
                // mapTypeId: 'terrain'
            };
            if(config) for(var attr in config.settings)
                settings[attr] = config.settings[attr];
            var map = new google.maps.Map(elem, settings);
            var path = false;
            if(config && config.path) {
                path = new google.maps.Polyline({
                    path: config.path,
                    geodesic: true,
                    strokeOpacity: 0,
                    icons: [{
                        icon: {
                            path: 'M 0,-1 0,1',
                            strokeOpacity: 1,
                            strokeColor: '#4F5271',
                            scale: 2
                        },
                        offset: '0',
                        repeat: '10px'
                    }],
                    map: map
                });
            }
            var markers = [];
            if(config && config.markers) {
                for(var i=0;i<config.markers.length;++i)
                    markers.push(new google.maps.Marker({
                        position: config.markers[i],
                        map: map
                        // title: "popup text"
                    }));
            }
            return {
                map: map,
                path: path,
                markers: markers
            };
        })(elem, config);
    }
});
