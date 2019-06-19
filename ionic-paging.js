angular.module('kargoe.Wall', [])
.service('Paging', function(animate, abstractGallery, API) {
    var self = this;
    this.page = function(body, config) {
        var page = {
            index: config.index,
            size: config.size,
            DOM: body,
            h: 0,
            pos: Infinity,
            data: config.data,
            parent: config.parent,
            lazy: {
                load: config.load,
                unload: config.unload
            },
            ext: [], pending: false, built: []
        };
        page.load = function(unshift) {
            if(unshift)   page.parent.unshift(page.DOM)
            else        page.parent.appendChild(page.DOM);
            if(typeof page.lazy.load === 'function')
                return page.lazy.load(page);
        }
        page.unload = function( ) {
            var ret;
            if(typeof page.lazy.unload === 'function')
                ret = page.lazy.unload(page);
            page.DOM.delete( );
            return ret;
        }
        return page;
    }
    function find(set, pos) {
        pos = Math.floor(pos);
        if(!set.length) return -1;
        if(set[0].pos === Infinity || set.length === 1) return 0;
        var step = Math.ceil(set.length / 2), seek = Math.ceil(set.length / 2);
        while(step > 0) {
            if(seek >= set.length) seek = set.length - 1;
            var page = set[seek];
            if(page.pos === Infinity) // we're too far in the list
                next = seek - step;
            else if(pos < page.pos) // also too far
                next = seek - step;
            else if(pos > page.pos + page.h) // not far enough
                next = seek + step;
            else // just right
                return seek;
            if(next < 0) return 0;
            else if(step == 1) return next >= set.length ? set.length - 1: next;

            step = Math.ceil(step/2);
            seek = next >= set.length ? set.length -1 : next;
        }
        return seek;
    }
    this.range = function(stream, config) {
        var source = {
            stream: stream,
            streaming: true,
            data: [],
            range: {
                next: false,
                prev: false,
                newest: -Infinity,
                index: 0, negativity: 0
            },
            seeds: []
        };
        source.read = function(data, forward) {
            var op = forward ? [].push : [].unshift;
            op.apply(source.data,
                typeof config.sort === 'function'
                    ? data.result.sort(config.sort)
                    : data.result);
            var more = forward ? 'next' : 'prev';
            source.range[more] = data[more];
            if(!forward) source.range.index -= data.result.length;
            if(!source.seeds.length) { // establish gallery seeds.
                var acc = source.range.index, sigma = 0;
                while(acc > 0) {
                    var seed = abstractGallery.gallery( );
                    source.seeds.push({ len: seed.len, rand: seed.seed, index: sigma });
                    acc -= seed.len; sigma += seed.len;
                }
                source.range.negativity = source.range.index - acc;
            }
            source.streaming = false;
            if(typeof config.callbackOnce === 'function') {
                config.callbackOnce(source.data);
                delete config.callbackOnce;
            }
        }
        source.more = function(forward) {
            return new Promise(function(resolve, reject) {
                var more = forward ? 'next' : 'prev';
                if(source.streaming || !source.range[more]) reject("invalid stream.more invocation");
                source.streaming = true;
                source.range[more]( )
                    .then(function(data) { source.read(data, forward); resolve(true) })
                    .catch(reject);
            });
        }
        source.next = function( ) { return source.more(true) }
        source.prev = function( ) { return source.more(false) }
        source.stream
            .then(function(data) {
                var args = data.reflect;
                if(!args) throw("Must reflect arguments for ranged GET");
                source.range.newest = data.pagination.newestTimeStamp;
                source.range.index = data.pagination.index;
                if(typeof config.sort !== 'function')
                    throw("Sort must be defined, and should sort chronologically for ranged GET");
                [].push.apply(source.data, data.result.sort(config.sort));
                if(!source.data.length) throw("Invalid timestamp");
                if(!source.data[0].TimeStamp) throw("TimeStamp not included in return data");
                args[2].params.end = source.data[0].TimeStamp;
                args[2].params.newestTimeStamp = data.pagination.newestTimeStamp;
                delete args[2].params.start;
                API.do.apply(API, args)
                    .then(function(data) { source.read(data, false) });
            })
            .catch(console.log);
        return source;
    }
    this.source = function(stream, config) {
        var source = {
            stream: stream,
            streaming: true,
            data: [], dataBuilders: config.dataBuilders,
            nextPage: false
        };
        source.read = function(data) {
            [].push.apply(source.data,
                typeof config.sort === 'function'
                    ? data.result.sort(config.sort)
                    : data.result);
            source.nextPage = data.next;
            source.streaming = false;
            if(typeof config.callbackOnce === 'function') {
                config.callbackOnce(source.data);
                delete config.callbackOnce;
            }
        }
        source.more = function( ) {
            return new Promise(function(resolve, reject) {
                if(source.streaming || !source.nextPage) reject("invalid stream.more invocation");
                source.streaming = true;
                source.nextPage( )
                    .then(function(data) { source.read(data); resolve(true) })
                    .catch(reject)
            });
        }
        source.stream
            .then(source.read)
            .catch(console.log);
        return source;
    }
    this.pageList = function(container, config, wallConfig, release) {
        var list = {
            stream: config.stream,
            virtualSize: (config && config.range)
                            ? config.range / 2
                            : 3000,
            gulped: 0, seed: config.seed,
            gulpedRange: [Infinity, -Infinity],
            dataBuilder: config.dataBuilder,
            biteSize: config.gulp ? config.gulp : 10,
            lazy: config.lazy,
            body: ["div"].HTML( ),
            children: [],
            next: 0,
            threadCount: config.threadCount,
            deferred: [], loading: false, threads: [],
            display: { start: -1, end: -1 } // child INDEX
        };

/* the rest of the sample is proprietary */
