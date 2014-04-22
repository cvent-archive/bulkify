var staticModule = require('static-module');
var path = require('path');
var glob = require('glob');
var through = require('through2');
var bulk = require('bulk-require');

module.exports = function (file, opts) {
    if (/\.json$/.test(file)) return through();
    if (!opts) opts = {};
    var vars = opts.vars || {
        __filename: file,
        __dirname: path.dirname(file)
    };
    
    var sm = staticModule(
        { 'bulk-require': bulkRequire },
        { vars: vars }
    );
    return sm;
    
    function bulkRequire (dir, globs) {
        var gs = globs.slice();
        var stream = through();
        var res = bulk(dir, globs, {
            require: function (x) { return x }
        });
        stream.push(walk(res));
        stream.push(null);
        return stream;
    }
};

function walk (obj) {
    if (typeof obj === 'string') {
        return 'require(' + JSON.stringify(obj) + ')';
    }
    else if (obj && typeof obj === 'object' && obj.index) {
        return '(function () {'
            + 'var f = ' + walk(obj.index) + ';'
            + Object.keys(obj).map(function (key) {
                return 'f[' + JSON.stringify(key) + ']=' + walk(obj[key]) + ';';
            }).join('')
            + 'return f;'
            + '})()'
        ;
    }
    else if (obj && typeof obj === 'object') {
        return '{' + Object.keys(obj).map(function (key) {
            return JSON.stringify(key) + ':' + walk(obj[key]);
        }).join(',') + '}';
    }
    else {
        throw new Error("I don't even know: " + obj);
    }
}
