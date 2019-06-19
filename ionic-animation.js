angular.module('kargoe.animate', [])
.service('animate', function($rootScope) {
    var self = this;
    
    this.gifDuration = function(url, then) { // should be local files only
        var xhr = new XMLHttpRequest( ); // expect 'almost' 0 delay.
        xhr.open('GET', url, true);
        xhr.responseType = "arraybuffer";
        xhr.setRequestHeader('Cache-Control', 'no-cache')
        xhr.onreadystatechange = function ( ) {
            if(xhr.readyState == 4) {
                var bytes = new Uint8Array(xhr.response);
                var bin = '';
                var duration = 0;
                var getFrameDelay = function(arr, i) {
                    if(arr[i] == 0x21 && arr[i+1] == 0xF9
                    && arr[i+2] == 0x04 && arr[i+7] == 0x00) {
                        // it's in network byte order [smallest powers first]
                        var delay = arr[i+4] | (arr[i+5] << 8);
                        return delay < 2 ? 2 : delay;
                    } return 0;
                };
                for(var i=0; i < bytes.length; ++ i)
                    duration += getFrameDelay(bytes, i);
                then(duration);
            }
        };
        xhr.send(null);
    };
    this.gifPlay = function(backgroundElem, gifSrc, style) {
      var parent = backgroundElem.parentElement
        , img = new Image ( )
      img.style.pointerEvents = 'none'
      backgroundElem.style.pointerEvents = 'none'
      img.setAttributes ( style )

      parent.appendChild(img)
      function hookExpire ( duration ) {
        img.src = gifSrc
        function disappear ( ) {
          backgroundElem.style.pointerEvents = '' // reset original
          img.delete ( ) // remove self from DOM
        }
        // i.e. duration is 100 for a 1s gif and setTimeout wants 1000 for 1 second < duration * 10 QED
        setTimeout( disappear, duration * 10 ) // duration is in 100ths of 1 second
      }
      self.gifDuration ( gifSrc, hookExpire )
    }
    this.loader = {
        spin: null,
        spinning: null,
        main: null,
      load: function( ) {
            if(this.spin) return
            this.main = document.getElementById("mainContainer");
            this.spin = document.createElement("div");
            this.spin.classList.add("zoomable");
            this.spinning = document.createElement("div");
            this.spinning.classList.add("zoomable-img", "loading-spinner")
            this.spin.appendChild(this.spinning);
            this.main.appendChild(this.spin);
        },
        unload: function( ) {
            if(this.spin) {
                this.main.removeChild(this.spin)
                this.spin = null
            }
        }
    };
        this.scroll = function(Element, Limit, ctx) {
        return (function(e, limit, ctx) {
            var velocity = {x: 0, y: 0}, time = 0, track = {x: 0, y: 0};
            function finalize( ) {
                velocity = {x:track.x, y:track.y};
                time = Date.now( );
            }
            function delta(t, axis) {
                return -velocity[axis] * Math.exp(-t / 325);
            }
            function dxdy( ) {
                if(velocity.x === 0 && velocity.y === 0) return false; // abort, no speed
                var elapsed = Date.now( ) - time;
                // standard deceleration function
                var dx = delta(elapsed, 'x');
                var dy = delta(elapsed, 'y');
                // deceleration cutoff (stop scrolling, it's too slow)
                if(Math.abs(dy) < 0.5) velocity.y = 0;
                if(Math.abs(dx) < 0.5) velocity.x = 0;
                return { dx: dx, dy: dy };
            }
            function exec( ) {
                var v = dxdy( );
                if(v === false) return false;
                var m = e.style.webkitTransform
                    .match(/\(([^,]+)px, ([^,]+)px, ([^,]+)px\)/);
                if(!m) throw "nothing to transform, set webkitTransform style";
                var x = parseInt(m[1], 10), y = parseInt(m[2], 10);
                // these 2 lines are easier to read as 2 lines.
                var dx = x - v.dx;
                var dy = y - v.dy;
                // max is always 0 (scrolling down/right is negative)
                // in some niche case this might not fit, cross that bridge at that time.
                if(dx > 0) dx = 0;
                if(dx < -limit.x) dx = -limit.x;
                if(dy > 0) dy = 0;
                if(dy < -limit.y) dy = -limit.y;
                if(ctx) ctx(dy);
                else e.style.webkitTransform = "translate3d(" +dx+"px, " +dy+"px, 0px)";
                return true;
            }
            return {
                track: function(dx, dy) { track = { x: dx, y: dy } },
                finalize: finalize,
                exec: exec
            };
        })(Element, Limit, ctx);
    };
    this.scroller = function(element, parent, wallConfig, refresh) {
        return (function(e, p, config, refresher) {
          var viewPort = [ 'div'
                         , 'generic-scroll-viewport'
                         , wrap
                         , { overflow: 'hidden'
                           , width: '100%'
                           , height: '0px' // height is later fit to view
                           }
                         , p
                         ].HTML( ) // parent is not to be used in this scope, other than for bounding
            , wrap = [ 'div' // tag, class, children/child, extStyle, parent
                     , 'generic-scroll-element'
                     , e
                     , { webkitTransform: 'translate3d(0px, 0px, 0px)' }
                     , viewPort
                     ].HTML( )
            , nop = function( ) { }
          if(refresher) viewPort.unshift(refresher.parent)
          else refresher = { shown: nop, onLimit: nop, onRelease: nop }
          var limit = 0, height = 0, cur = 0, y = 0
            , viewHeight = 0, scroll = null
            , parentBounds = { }, b = { }
          function position( ) { return -y }
          function attenuator( ) { return scroll }
          function scrollTo(pos, offset, ignoreOverride) { // offset here is dy
            if(config && typeof config.override === 'function')
              var res = config.override({ y: y, attenuator: scroll, offset: offset, scrollBy: scrollBy })
            if(res && !ignoreOverride) return // abort
            if(pos > 0) {
              refresher.onLimit(offset)
              pos = 0
            }
            else if(pos < -limit) pos = -limit
            else if(pos < 0 && refresher.shown( ))
              refresher.onLimit(offset)
            
            if(!refresher.shown( )) {
              y = pos
              wrap.style.webkitTransform = "translate3d(0px, " + y + "px, 0px)"
            }
            
            if(config && typeof config.onScroll === 'function')
              config.onScroll({ y: y, attenuator: scroll, offset: offset, scrollBy: scrollBy })
          }
          function scrollBy(offset, ignoreOverride) {
            scrollTo(y + offset, offset, ignoreOverride)
          }
          function redraw( ) { // re-calculate bounds
            parentBounds = parent.getBoundingClientRect( )
            viewHeight = parentBounds.bottom - parentBounds.top
            b = wrap.getBoundingClientRect( )
            height = b.bottom - b.top
            limit = height - (viewHeight-15)
            if(limit < 0) limit = 0
          }
          function drag(event) {
            var offset = event.touches[0].screenY - cur
            scroll.track(0, offset)
            cur = event.touches[0].screenY
            scrollTo(y + offset, offset)
          }
          function release(event) {
            wrap.removeEventListener('touchmove', drag, false)
            wrap.removeEventListener('touchend', release, false)
            scroll.finalize( )
            if(config && typeof config.onRelease === 'function')
              config.onRelease({ y: y, attenuator: scroll, scrollBy: scrollBy })
            if(refresher) refresher.onRelease( )
          }
          function touchstart(event) {
            redraw( )
            if(limit < 0) return // nothing to scroll
            if(!event.touches || !event.touches.length) return // invalid event
            if(config && typeof config.prevent === 'function')
              if(config.prevent( )) return
            event.stopPropagation( )
            // attenuator
            scroll = self.scroll(wrap, { x: 0, y: limit }, scrollTo)
            cur = event.touches[0].screenY
            var m = wrap.style.webkitTransform
                    .match(/\(([^,]+)px, ([^,]+)px, ([^,]+)px\)/)
            if(!m) return
            y = parseFloat(m[2])
            wrap.addEventListener('touchmove', drag, false)
            wrap.addEventListener('touchend', release, false)
          }
          wrap.addEventListener('touchstart', touchstart, false);
          function h(e) { // a harsh but thorough computation of height
            var b = e.getBoundingClientRect( )
              , s = window.getComputedStyle(e)
              , m = { top: parseFloat(s["margin-top"])
                    , bottom: parseFloat(s["margin-bottom"])
                    }
            return (b.bottom + m.bottom) - (b.top - m.top)
          }
          var screenHeight = window.innerHeight
            , grandParent = p.parentElement
          // this is an intense call, don't call it during performance sensitive time
          function refill( ) {
            viewPort.style.height = '0px'
            // sum sibling heights
            function sumSpace(sigma, child) { return sigma + h(child) }
            var openSpace = [].reduce.call(grandParent.children, sumSpace, 0)
            viewPort.style.height = h(grandParent) - openSpace + 'px'
          }
          // init
          if(config && config.explicitHeight) {
            viewPort.style.height = config.explicitHeight + 'px'
          } else refill( )

          return { viewPort: viewPort
                 , wrap: wrap
                 , touchstart: touchstart
                 , redraw: redraw
                 , refill: refill
                 , scrollTo: scrollTo
                 , scrollBy: scrollBy
                 , pos: position
                 , attenuator: attenuator
                 }
        })(element, parent, wallConfig, refresh)
    }
})




/* from an item control */
        var loveThis =
        (function(item, func, anim) {
            return function( ) {
                // //'img/unlove-animation.gif' : 'img/love-animation.gif'
                // flip the icon state this instant
                if(item.LikesIcon) { // subject to rejection by server
                    var state = item.LikesIcon.classList.contains("post-likes-icon-red");
                    item.LikesIcon.parentElement.style.pointerEvents = 'none'
                    setTimeout(function( ) {
                      if(item.LikesIcon && item.LikesIcon.parentElement)
                        item.LikesIcon.parentElement.style.pointerEvents = ''
                    }, 2000)
                    if(state) { // it's presently loved, unlove it
                        item.LikesIcon.setAttribute ('class', 'post-likes-icon post-icon')
                        animate .gifPlay ( item.LikesIcon, 'img/unlove-animation.gif', 'gif-unlove-animation' )
                    } else { // it's not loved, and now we love it.
                        item.LikesIcon.setAttribute ('class', 'post-likes-icon-red post-icon')
                        animate .gifPlay ( item.LikesIcon, 'img/love-animation.gif', 'gif-love-animation' )
                    }
                    if(item.LikesText) { // this is implicitly true if icon dom exists, but whatever
                        // item.NumLikes is a synchronous state, and only changes when the API tells it so.
                        var newLikes = item.NumLikes + (state? -1 : 1); // we're reversing it.
                        item.LikesText.textContent = newLikes; // if we liked it before, now we took a like away.
                    }
                }
                // this function takes time, and sets the state later
                func( item, function(liked) {
                    if(item.LikesIcon) { // bound later
                        item.LikesIcon.setAttribute("class",
                            (liked? "post-likes-icon-red" : "post-likes-icon") + " post-icon");
                        if(item.LikesText) { // the underlying post object changed.
                            item.LikesText.textContent = item.NumLikes; // so use the direct reference.
                        }
                    }
                });
            }
        })(post, _love, animate); // bound to scope


    function _love( item, then ) { // _ because it's a reflection
        var func = item.UserLikesPost ? item.unlove : item.love
          , correct = function(data) {
              var loved = (data&&Array.isArray(data)&&data[0])
              if( loved ) {
                item.UserLikesPost = true
                item.NumLikes ++
              } else {
                item.UserLikesPost = false
                item.NumLikes --
              }
              if(then) then( loved )
            }
        func( )// item.love OR item.unlove
        .then(correct)
        .catch(function(err) {
          console.log(err)
          correct([ item.UserLikesPost ? true : false ])
        })
    }
