var http = require('http');
var mongo = require('mongodb').MongoClient;
var Search = require('bing.search');
var BING_KEY = process.env.BING_KEY || 'lbJOm1u6SfZnUQ/lECdcfDejeyqnfIY9Q1ZSAs8vPRk';
var connectionString = process.env.MONGO || 'mongodb://localhost:27017/imagesearch';
var port = process.env.PORT || 3000;

var info = '<html>' +
    '<head>' +
    '<style>' +
    'body { margin-left: 5em; margin-top: 5em;}' +
    'h1, h3 {font-family: sans-serif;}' +
    'code {background-color: #ddd; color: #de1345; padding: 5px; border-radius: 3px;}' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<h1> Image Search Abstraction Layer Microservice</h1>' +
    '<br>' +
    '<h3>To get a json list of image search results</h3>' +
    '<code>https:rs-imagesearch.herokuapp.com/api/imagesearch/gato%20class?offset=10</code>' +
    '<h3>the offset parameter enables pagination by displaying after the offset number of results.</h3>' +
    '<h3>To get the last twenty image searches made with this use</h3>' +
    '<code>https:rs-imagesearch.herokuapp.com/api/latest/imagesearch/</code>' +
    '</body>' +
    '</html>'; 

mongo.connect(connectionString, function(err, db) {
    if (err) throw err;
    console.log('mongodb connected on:', connectionString)
    
    
    
    http.createServer(function(req, res) {
        if (req.url === '/') {
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(info);
        } else if ( /api\/latest\/imagesearch/.test(req.url)) {
            // handle search history
            db.collection('latest').find().toArray(function(err, data) {
                if(err) throw err;
                data = data.map(function(d){
                    d.when = new Date(d.when);
                    return d;
                    }).reverse();
                    //console.log(data)
                res.writeHead(200, {"Content-Type": "text/plain"})
                res.end(JSON.stringify(data))
                      db.close()                                 
            })
            
        } else {
            // extract offset or default offset to 10
            var offset = 10;
            if (/offset/.test(req.url)) {
                offset = parseInt(req.url.split('=')[1]);
                req.url = req.url.replace(/\?offset=\d+/, "");
            }
            
            // get search params
            var searchParams = req.url.split('/').pop().replace('%20',' ');
            
            var search = new Search(BING_KEY);
            
             search.images(searchParams, {top: 10, skip: offset}, function(err, data) {
                 if(err) throw err
                 
                var results = data.map(function (d){
                    return {
                        "url" : d.url,
                        "pageUrl": d.sourceUrl,
                        "alt": d.title,
                        "thumbnail": d.thumbnail.url
                    }
                })
                res.writeHead(200, {"Content-Type": "text/plain"})
                res.end(JSON.stringify(results))
                
                db.collection('latest').insert({ 
                        "term" : searchParams, 
                        "when": new Date().getTime() 
                    },function(err, data) {
                        if(err) throw err;
                        db.close();                 
                })               
            })
        }       
    }).listen(port)
    console.log('serving http on', port)  
})
