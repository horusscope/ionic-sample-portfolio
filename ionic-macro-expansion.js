/* sample 1 */
  this.dialogue =
    [ 'div'
    , 'app-login-wrap'
    , [ [ 'div', 'overlay-video'
        , [ [ 'video', { 'class' : 'video', id : 'loginvid'
                       , autoplay : true, loop: 'loop'
                       , playsinline : 'playsinline', 'webkit-playsinline' : 'webkit-playsinline'
                       , src : 'img/video/Kargoe_Log_In_2_1.mp4'
                       }
            ]
          ]
        ]
      , [ 'div', 'home-logo' ]
      , [ 'div', 'content-inner'
        , [ [ 'p', 'tagline', "Kargoe's Facebook Login" ]
          , [ 'div', 'fb-login-info'
            , [ [ 'p', 'fb-login-info', 'Login as Facebook User:' ]
              , [ 'div', 'fb-login-avatar' ]
              , [ 'p', 'fb-login-name', ' ' ]
              ]
            ]
          , [ 'div'
            , { 'class' : 'kargoe-login-submit'
              , touchend : sendLoginToAPI
              }
            , 'Log Me In'
            ]
          , [ 'div', 'kargoe-login-alt'
            , [ [ 'span', { touchend : functions.closeDialogue }, 'Cancel' ]
              , [ 'span', { touchend : relog }, 'Not You? Change User.' ]
              ]
            ]
          ]
        ]
      ]
    ] . HTML ( )
/* sample 2 */
      var descHTML = [ 'div', 'explora-desc-description' ] .HTML ( )
      var ItemId = Tag.ItemId || 'No'
        , showDescription =
          (function ( Parent ) {
            function desc ( tag ) {
              descHTML.innerHTML = tag.Description.HTMLDesanitize( )
              functions
              .dialogue ( 'Product Description'
                        , [ 'div'
                          , 'explora-desc-wrap'
                          , [ [ 'div', 'desc-text', tag.Title ], [ 'br' ]
                            , [ 'span', 'desc-span-text', 'Brand: ' ], [ 'span', 'desc-text', tag.Brand ]
                            , [ 'br' ], [ 'br' ]
                            , [ 'span', 'desc-span-text', 'Store : ' ], [ 'span', 'desc-text', tag.StoreName ]
                            , [ 'br' ], [ 'br' ]
                            , descHTML
                            , [ 'div', { 'class' : 'desc-popup-img'
                                       , style : { backgroundImage : 'url('+tag .ImageUrls[ 0 ]+')' }
                                       }
                              ]
                            ]
                          ] . HTML ( )
                        , [ 'div' ] . HTML ( )
                        )
              ( ) // exec new dialogue
            }
            return function ( event ) { API.do('Items', 'get', { id: Parent.ItemId }).then(desc).catch(console.log) }
          }) ( Tag )
/* sample 3 */
  function bindPostmates(Postmates, Button) { // '#postmates-schedule'
    functions.bindClick(
      Button
    , (function(postmates) {
         function Day(index) {
           switch(index) {
             case 0: return 'Mon.'
             case 1: return 'Tues.'
             case 2: return 'Wed.'
             case 3: return 'Thur.'
             case 4: return 'Fri.'
             case 5: return 'Sat.'
             case 6: return 'Sun.'
             default: return 'Error.'
           }
         }
         function translate(timeString) {
           var polarity = timeString > 1200 ? 'PM' : 'AM'
             , time = (timeString >= 1300 ? (timeString - 1200) : timeString).toString( )
           time = time.substr(0, time.length-2) + ':' + time.substr(time.length-2)
           return time+' '+polarity
         }
         function Time(index) {
           var row = postmates.DayInfo[index]
           return { day: Day(index)
                  , open: translate(row.Start)
                  , close: translate(row.End)
                  , enabled: row.On == true
                  }
         }
         function makeRow(index) {
           var data = Time(index)
             , str = data.enabled ? (data.open+' - '+data.close) : 'NOT AVAILABLE'
           return [ 'div'
                  , data.enabled ? 'availability-enabled' : 'availability-disabled'
                  , [ [ 'div', 'availability-day', data.day ]
                    , [ 'div', 'availability-hours', str ]
                    ]
                  ]
         }
         function availability( ) {
           var schedule = [ [ 'div', 'availability-store', 'STORE NAME' ]
                          , ['div', 'availability-timezone', [ [ 'div', 'timezone-static', 'Time Zone:' ]
                                                             , ['div', 'timezone-name', postmates.TimeZone]
                                                             ]
                            ]
                          ]
           for(var i=0;i<7;++i) schedule.push(makeRow(i))
           return ['div', 'availability-wrap', schedule].HTML( )
         }
         return function( ) {
           var tst = availability( )
           functions.dialogue( 'Delivery Hours'
                             , availability( )
                             , ['div'].HTML( )
                             , function( ) { }
                             , { page: ['comment-border']
                               , classes: ['comment-fullscreen', 'comment-slide-in']
                               , animate: 'left: 0 !important'
                               , stack: true
                               }
                             )( )
         }
       })(Postmates))
  }






/* prototypes from App.js */

Array.prototype.as = function(attr) {
    if(this.length) return this.map(function(obj) { return obj[attr] })
    return [ ]
}
Array.prototype.contains = function( any ) {
  function matches( e ) { return e === any }
  return this.filter(matches).length > 0
}
TouchEvent.prototype.touchList = function ( ) {
  var acc = [ ], list = ( this.touches.length ? this.touches : this.changedTouches )
  for( var i = 0 ; i < list.length ; ++ i )
    acc .push ({ x : list[i].clientX
               , y : list[i].clientY })
  return acc
}
HTMLElement.prototype.favicon = function ( prefix ) { // what goes before rel links
  return $(this).find('link').toArray( ).reduce( search, [ ] )
  function search ( results, Link ) {
    var rel = Link.getAttribute ( 'rel' )
    if( rel && rel.match(/icon/) ) {
      var href = Link.getAttribute ( 'href' )
      if( href )
        results.push( href.match(/^(http|https)/)
                    ? href // it's relative
                    : ( prefix // https://domain.com
                      + ( href[0]=='/'? href :'/'+href ) // leading forward slash
                      )
                    )
    }
    return results
  }
}
HTMLElement.prototype.meta = function ( ) { // simplify [reduces parallel meta fields]
  var hits = { 'title' : [ 'og:title', 'twitter:title' ]
             , 'image' : [ 'og:image', 'twitter:image', 'twitter:image:src' ]
             , 'alt' : [ 'twitter:image:alt' ]
             , 'url' : [ 'og:url', 'twitter:url' ]
             , 'domain' : [ 'og:domain', 'twitter:domain' ]
             , 'site_name' : [ 'og:site_name' ]
             , 'author' : [ 'article:author' ]
             , 'card' : [ 'twitter:card' ]
             , 'site' : [ 'twitter:site' ]
             , 'mobile_title' : [ 'apple-mobile-web-app-title' ]
             , 'theme' : [ 'theme-color' ]
             }
  function properties ( list, prop ) {
    prop.property = prop.getAttribute('property')
    var name = ( prop.property || prop.name )
      , value = ( prop.content || prop.value )
    for( var k in hits )                           // Q.E.D. k = 'title' and i = 0
      for( var i = 0 ; i < hits[k].length ; ++ i ) // hits[k][i] -> 'og:title'
        if( name === hits[k][i] ) { list[k] = value ; break }
    
    
    if( hits[name] ) list[name] = value // so if hits['title'] then list['title'] is content of meta
    return list // { title : 'Earthquake!', image: 'whatever.src' } etc
  }
  return $(this).find('meta').toArray( ).reduce( properties, { } )
}

HTMLElement.prototype.safeClick = function ( f, bindImmediately ) {
  this._safe = { click : click.bind(this,f)
               , move : move.bind(this)
               , end : end.bind(this,f)
               , d : { w : window.innerWidth , h : window.innerHeight }
               }
  if( bindImmediately ) this.addEventListener ( 'touchstart', this._safe.click )
  return this._safe.click
  function click ( e, event ) {
    if( event.originalEvent ) event = event.originalEvent // jQuery semantics
    if( ! event.touches || ! event.touches.length ) return
    var t = event.touches [ 0 ]
    this.dxdy = { x : t.clientX, y : t.clientY, dX : 0, dY : 0 }
    this.addEventListener ( 'touchmove', this._safe.move )
    this.addEventListener ( 'touchend', this._safe.end )
  }
  function move ( event ) {
    var t = event.touches [ 0 ], a = t.clientX - this.dxdy.x, b = t.clientY - this.dxdy.y
    this.dxdy.dX = Math.abs(a)
    this.dxdy.dY = Math.abs(b)
  }
  function end ( e, event ) {
    this.removeEventListener ( 'touchmove', this._safe.move )
    this.removeEventListener ( 'touchend', this._safe.end )
    if( ( this.dxdy.dX > this._safe.d.w * 0.01 ) || ( this.dxdy.dY > this._safe.d.h * 0.01 ) ) return
    if( typeof e === 'function' ) e ( event )
  }
}

HTMLElement.prototype.setAttributes = function( attr ) {
  if( attr )
    switch( typeof attr ) {
        case 'number' : this.setAttribute( 'id', attr ) ; break
        case 'string' : this.setAttribute( 'class', attr ) ; break
        case 'object' :
          var classML = attr // { some : thing, or : whatever }
          for( var prop in classML ) {
            if( prop === 'after' && typeof classML[prop] === 'function' ) {
              this._after = classML[prop].bind(this)
              continue
            }
            var value = classML [prop]
            switch( typeof value ) {

              case 'boolean' : // { prop : true }
              case 'number' : // { prop : 5 }
              case 'string' :
              this.setAttribute( prop, value )
              break // { prop : 'string' }
              // value should be bound to the scope it was sent from
              case 'function' :
              this.addEventListener( prop, value ) // { prop : onTouch }
              delete attr[prop] // we promise that listeners are added exactly once
              break
              case 'object' : // e.g. 'style'
                for( var sub in value ) // for { var color from elem.style }
                  this [prop] /*this.style*/ [sub] /*this.style.color*/ = value [sub] // input.style.color
              break
              default : break
            }
          }
          break
      // if we get a function during class/attr construction, call the function on the element
        case 'function' : attr ( this ) ; break
        default : break
    }
  return this
}
// ["div", "className"|classML, "innerText"|[childList:HTML], { style: attrs }, DOMParent]
Array.prototype.HTML = function( isChild ) {
  // TODO: img/bgImg macros
  if( this[0] instanceof Node ) return this[0]
  if( (typeof this[0] === 'number' || typeof this[0] === 'boolean')
        && this.length === 1 ) return document.createTextNode( this[0] )
  var e = document.createElement( this [0] || 'div' )
          .setAttributes ( this[1] )

  if(this[3]) {
    if(this[3].style) {
      for(var attr in this[3]) if(attr !== 'style') e.setAttribute(attr, (this[3][attr] === true ? "" : this[3][attr]))
      for(var attr in this[3].style) e.style[attr] = this[3].style[attr]
    } else for(var attr in this[3]) e.style[attr] = this[3][attr]
  }
  if(this[4] instanceof HTMLElement) this[4].appendChild(e)
  if(typeof this[2] === 'string' || typeof this[2] === 'number')
    e.appendChild(document.createTextNode(this[2]))
  else if(this[2] instanceof Node)
    e.appendChild(this[2]);
  else if(Array.isArray(this[2])) {
    var after = this[2] .reduce ( list, [ ] )
    e._collect = after
  } else if(this[2] instanceof HTMLString)
    e.innerHTML = this[2].str

  function exe(e){ if(e._after) e._after( ) }
  if(e._collect) e._collect.forEach(exe) // after insertion [valid e.parentElement]
  if(!isChild && e._after) e._after ( ) // root anyway.
  return e

  function list ( acc, iter ) {
    var html = false
    if( Array.isArray(iter) ) {
      html = iter .HTML ( true )
      acc .push ( html )
    }
    else if( iter instanceof Node ) html = iter
    else if( typeof iter === 'string' ) html = document.createTextNode(iter)
    if( html ) e .appendChild ( html )
    return acc
  }
}
var classML = function( data ) {
  function pairs( acc, value, index, list ) {
    if( index % 2 == 0 ) acc[ list[ index ] ] = list[ index + 1 ]
    return acc
  }
  var xml = data || { }
  if(typeof data === 'string') xml = { 'class': data }
  else if(typeof data === 'function') xml = data ( classML )
  else if(typeof data === 'object') {
    if(Array.isArray(data)) {
      if(data.length % 2) {
        var ace = classML( data[0] )
          , constructor = { }
        for(var a in ace) constructor[a] = ace[a]
        return data .slice ( 1 ) .reduce ( pairs, constructor )
      } else return data .reduce ( pairs, { } )
    } return xml // else implied, expected object literal { }
  }
  return typeof xml === 'object' ? xml : { }
}
const HTMLArgs = { noChildren : false, directStyle : false }
function HTMLString ( str ) {
  this .str = str
  return this
}
/* Example usage of String -> QueryParams primitive
var pita = 'http://api.example.org/orders?fields=OrderNo,Customer,OrderDate&sort=OrderDate&filter=OrderDate.gt.2012-01-01&limit=50'
00:41:15.512 undefined
00:41:18.461 pita.QueryParams( )
00:41:18.467 {fields: "OrderNo,Customer,OrderDate", sort: "OrderDate", filter: "OrderDate.gt.2012-01-01", limit: "50"}
 */
String.prototype.QueryParams = function ( ) {
  return this.match(/^([^\?]+)\?(.*)$/)[2].split(/&/)
         .reduce( function( list, pair ) {
           pair = pair.split('=')
           list[pair[0]] = pair[1]
           return list
         }, { })
}
String.prototype.ParseURL = function ( ) {
  var parts = this.match(/(http|https):\/\/([^\/]+)(.*)/)
  return parts?
    { protocol : parts[1]
    , domain : parts[2]
    , rest : parts[3]
    }
  : false
}
String.prototype.FirstURL = function ( knownInvalid ) {
  knownInvalid = knownInvalid || [ ]
  var lines = this.split(/[\r\n]/), match = ''
  for(var i = 0, line = lines[0]
     ; i < lines.length
     ; ++ i, line = lines[i]) {
    if( knownInvalid.indexOf(line) !== -1 ) continue // line was found in the array of known invalid lines
    var URI =
      line.match(/((((http|https):\/\/)|\/\/)([^\/]+)((\/[-+._%a-zA-Z0-9]+){0,})(\??([^ ]+))?)/i)
    if( URI ) return [URI[1], line]

    URI = line.match(/([^\. ]+\.[^\. ]+)/i)
    if( URI ) return [URI[1], line]

  } return ['', false]
}
// sanitize html <form> string inputs
String.prototype.HTMLSafe = function( ) {
    var filter = document.createElement("div");
    filter.innerHTML = this;
    $(filter).find("*").each(function( ) {
        var i = this.attributes.length;
        while( i -- ) this.removeAttributeNode(this.attributes[i]);
    });
    $(filter).find("a,script,iframe").remove( );
    return filter.innerHTML;
}
// "\"Hello World\"" -> "&quot;Hello World&quot;"
String.prototype.HTMLSanitize = function( ) {
    return this.replace(/[&<>"'\/]/g,
    function(s) {
        switch(s) {
            case "&": return "&amp;";
            case "<": return "&lt;";
            case ">": return "&gt;";
            case '"': return "&quot;";
            case "'": return "&#x27;";
            case "/": return "&#x2F;";
            default: return s;
        }
    }).replace(/(\n)/g, "<br>");
};
// map = { string: replacement, old: new } :: "string old" => "replacement new"
// all matches for a key will become their value in the string
String.prototype.ReplaceAll = function(map) {
    var pattern = new RegExp(Object.keys(map).join("|"), "gi");
    return this.replace(pattern, function(s) {
        return map[s.toLowerCase( )];
    });
}
// precompiled html replacement map
String.prototype.HTMLDesanitize = function( ) {
    return this.ReplaceAll({
        "&amp;": "&", "&lt;": "<", "&gt;": ">", "<br>": "\n",
        "&quot;": '"', "&#x27;": "'", "&#x2f;": "/"
    });
};
// "hello WoRLD" -> "Hello World"
String.prototype.firstCaps = function( ) {
    return this.split(" ").map(function(word) {
        return word.charAt(0).toUpperCase( )
            + word.slice(1).toLowerCase( );
    }).join(" ");
};
HTMLElement.prototype.delete = function( ) {
    if(this.parentElement) this.parentElement.removeChild(this);
}
HTMLElement.prototype.unshift = function(e) {
    return this.insertBefore(e, this.firstChild);
}
HTMLElement.prototype.shift = function( ) {
    var e = this.firstChild;
    if(e) e.delete( ); // see: HTMLElement.delete above, _ONLY_ removes from DOM
    return e;
}
HTMLElement.prototype.insertAfter = function(insert) {
  this.parentNode.insertBefore(insert, this.nextSibling)
}
var cyclicColorSet = (function( ) {
    var num = 0, set = ["#edf4d5", "#deeef9", "#f9e5ee", "#f9d8c8", "#fbecd1"];
    return function( ) {return set[num++ % set.length]}
})( );
function toCurrency(value) {
    if(typeof value !== 'number') value = Number(value);
    return value.toFixed(2)   // 2 precision
        .replace(/./g, function(character, index, whole) {
            // insert american currency commas
            return index && character !== "." && ((whole.length - index) % 3 === 0)
                    ? ',' + character
                    : character
        });
}
Number.prototype.abbreviated = function( ) {
  if (this.valueOf() === 0) return '0'; // log 0 = -inf
  var power = Math.log(this) * Math.LOG10E
    , interval = Math.floor(power/3)
    , abbreviation = [ '', 'k', 'm', 'b', 't', 'q' ]
    return interval+1 > abbreviation.length? this.toExponential(3) :Math.floor(this/(Math.pow(1000,interval))).toString( ) + abbreviation[interval]
}
Math.matrix = {
  identity : function ( InvertYAxis, x, y, z ) { // translation matrix [ 0, 0, 0 ]
    x = ( x || 0 ), y = ( y || 0 ), z = ( z || 0 )
    var i = ( InvertYAxis === true ? -1 : 1 )
    return new Float32Array([ 1, 0, 0, 0
                            , 0, i, 0, 0
                            , 0, 0, 1, 0
                            , x, y, z, 1 ])
  }
, multiply : function ( a, b ) { // note: a/b are flipped
    return new Float32Array([
      b[0]*a[0] + b[1]*a[4] + b[2]*a[8] + b[3]*a[12]
    , b[0]*a[1] + b[1]*a[5] + b[2]*a[9] + b[3]*a[13]
    , b[0]*a[2] + b[1]*a[6] + b[2]*a[10] + b[3]*a[14]
    , b[0]*a[3] + b[1]*a[7] + b[2]*a[11] + b[3]*a[15]
  
    , b[4]*a[0] + b[5]*a[4] + b[6]*a[8] + b[7]*a[12]
    , b[4]*a[1] + b[5]*a[5] + b[6]*a[9] + b[7]*a[13]
    , b[4]*a[2] + b[5]*a[6] + b[6]*a[10] + b[7]*a[14]
    , b[4]*a[3] + b[5]*a[7] + b[6]*a[11] + b[7]*a[15]

    , b[8]*a[0] + b[9]*a[4] + b[10]*a[8] + b[11]*a[12]
    , b[8]*a[1] + b[9]*a[5] + b[10]*a[9] + b[11]*a[13]
    , b[8]*a[2] + b[9]*a[6] + b[10]*a[10] + b[11]*a[14]
    , b[8]*a[3] + b[9]*a[7] + b[10]*a[11] + b[11]*a[15]

    , b[12]*a[0] + b[13]*a[4] + b[14]*a[8] + b[15]*a[12]
    , b[12]*a[1] + b[13]*a[5] + b[14]*a[9] + b[15]*a[13]
    , b[12]*a[2] + b[13]*a[6] + b[14]*a[10] + b[15]*a[14]
    , b[12]*a[3] + b[13]*a[7] + b[14]*a[11] + b[15]*a[15]
    ])
  }
, scale : function ( M, x, y, z ) {
    return new Float32Array([ M[0]*x, M[1]*x, M[2]*x, M[3]*x
          , M[4]*y, M[5]*y, M[6]*y, M[7]*y
                      , M[8]*z, M[9]*z, M[10]*z, M[11]*z
          , M[12], M[13], M[14], M[15] ])
  }
, perspective : function ( FOVy, AspectRatio, Near, Far ) {
    var f = 1.0 / Math.tan(FOVy/2)
      , nf = 1 / ( Near - Far ) // inverted z
    return new Float32Array([ f/AspectRatio, 0, 0, 0
                            , 0, f, 0, 0
                            , 0, 0, (Far+Near)*nf, -1
                            , 0, 0, 2*Far*Near*nf, 0 ])
  }
, translate : function ( M, x, y, z ) {
    return new Float32Array([ M[0], M[1], M[2], M[3]
          , M[4], M[5], M[6], M[7]
          , M[8], M[9], M[10], M[11]
  
          , M[0]*x + M[4]*y + M[8]*z + M[12]
          , M[1]*x + M[5]*y + M[9]*z + M[13]
          , M[2]*x + M[6]*y + M[10]*z + M[14]
          , M[3]*x + M[7]*y + M[11]*z + M[15] ])
  }
, rotate : function ( M, x, y, z ) { // NOTE: input matrix altered!
    var r, c, s
    if( typeof x === 'number' ) M = X( )
    if( typeof y === 'number' ) M = Y( )
    if( typeof z === 'number' ) M = Z( )
    return M
    function X ( ) {
      read ( x )
      return Math.matrix.multiply ( M, [ 1, 0, 0, 0
                                       , 0, c, s, 0
                                       , 0,-s, c, 0
                                       , 0, 0, 0, 1 ] )
    }
    function Y ( ) {
      read ( y )
      return Math.matrix.multiply ( M, [ c, 0, -s, 0
                                       , 0, 1, 0, 0
                                       , s, 0, c, 0
                                       , 0, 0, 0, 1 ] )
    }
    function Z ( ) {
      read ( z )
      return Math.matrix.multiply ( M, [ c, s, 0, 0
                                       , -s, c, 0, 0
                                       , 0, 0, 1, 0
                                       , 0, 0, 0, 1 ] )
    }
    function R ( n ) { return n * Math.PI * 2 }
    function read ( n ) { r = R(n), c = Math.cos(r), s = Math.sin(r) }
  }
}
window.delta = {
  past : [ 0, 90, 0 ]
, rot : [ 0, 0, 0 ]
, xyz : [ 0, 0, 0 ]
, dxyz : [ 0, 0, 0 ]
, event : function ( event ) {
    var xyz = [ event.alpha - this.past[0], event.beta - this.past[1], event.gamma - this.past[2] ]
      , x = this.rot[0], y = this.rot[1], z = this.rot[2]
    if( xyz[0] > 1 ) xyz[0] = 1
    if( xyz[0] < -1 ) xyz[0] = -1
    if( xyz[1] > 1 ) xyz[1] = 1
    if( xyz[1] < -1 ) xyz[1] = -1
    if( xyz[2] > 1 ) xyz[2] = 1
    if( xyz[2] < -1 ) xyz[2] = -1
    this.dxyz = [ xyz[0] - this.xyz[0], xyz[1] - this.xyz[1], xyz[2] - this.xyz[2] ]
    this.xyz = xyz
    var inverse = [ 1 - (this.dxyz[0]/360), 1 - (this.dxyz[1]/360), 1 - (this.dxyz[2]/360) ]
    inverse[0]*= (inverse[0] <0 ?-1 : 1) * (  - x )
    inverse[1]*= (inverse[1] <0 ?-1 : 1) * (  - y )
    inverse[2]*= (inverse[2] <0 ?-1 : 1) * (  - z )
    
    this.rot[0] -= xyz[0] - (inverse[0] *0.015)
    this.rot[1] -= xyz[1] - (inverse[1] *0.015)
    this.rot[2] -= xyz[2] - (inverse[2] *0.015)
    this.rot[0] = this.rot[0] % 360
    this.rot[1] = this.rot[1] % 360
    this.rot[2] = this.rot[2] % 360
    this.past = [ event.alpha, event.beta, event.gamma ]
  }
}
window.addEventListener( 'deviceorientation', window.delta.event.bind(window.delta) )

/* end of App.js */


