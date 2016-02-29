// Dependencies
var mongoose        = require('mongoose');
var User            = require('./model.js');
var SparqlClient 	= require('sparql-client');
var request         = require('request');
var async           = require('async');

// Opens App Routes
module.exports = function(router) {

    // GET Routes
    // --------------------------------------------------------
    // Retrieve records for all users in the db
    router.get('/users', function(req, res,next){

        // Uses Mongoose schema to run the search (empty conditions)
        var query = User.find({});
        query.exec(function(err, users){
            if(err) {
                res.send(err);
            } else {
                // If no errors are found, it responds with a JSON of all users
                res.json(users);
            }
        });
    });
	
	router.get('/hello', function(req, res,next){
            res.send("Hello world");
    });

    // POST Routes
    // --------------------------------------------------------
    // Provides method for saving new users in the db
    router.post('/users', function(req, res, next){
		
		console.log("HEre");
        // Creates a new User based on the Monngoose schema and the post bo.dy
        var newuser = new User(req.body);

        // New User is saved in the db.
        newuser.save(function(err){
            if(err){
                res.send(err);
			}
            else{
                // If no errors are found, it responds with a JSON of the new user
                res.json(req.body);
			}
        });
    });

    // Retrieves JSON records for all users who meet a certain set of query conditions
    router.post('/query/', function(req, res, next){

        // Grab all of the query parameters from the body.
        var lat             = req.body.latitude;
        var long            = req.body.longitude;
        var distance        = req.body.distance;
        var male            = req.body.male;
        var female          = req.body.female;
        var other           = req.body.other;
        var minAge          = req.body.minAge;
        var maxAge          = req.body.maxAge;
        var favLang         = req.body.favlang;
        var reqVerified     = req.body.reqVerified;

        // Opens a generic Mongoose Query. Depending on the post body we will...
        var query = User.find({});

        // ...include filter by Max Distance (converting miles to meters)
        if(distance){

            // Using MongoDB's geospatial querying features. (Note how coordinates are set [long, lat]
            query = query.where('location').near({ center: {type: 'Point', coordinates: [long, lat]},

                // Converting meters to miles. Specifying spherical geometry (for globe)
                maxDistance: distance * 1609.34, spherical: true});

        }

        // ...include filter by Gender (all options)
        if(male || female || other){
            query.or([{ 'gender': male }, { 'gender': female }, {'gender': other}]);
        }

        // ...include filter by Min Age
        if(minAge){
            query = query.where('age').gte(minAge);
        }

        // ...include filter by Max Age
        if(maxAge){
            query = query.where('age').lte(maxAge);
        }

        // ...include filter by Favorite Language
        if(favLang){
            query = query.where('favlang').equals(favLang);
        }

        // ...include filter for HTML5 Verified Locations
        if(reqVerified){
            query = query.where('htmlverified').equals("Yep (Thanks for giving us real data!)");
        }

        // Execute Query and Return the Query Results
        query.exec(function(err, users){
            if(err){
                res.send(err);
			}
            else{
                // If no errors, respond with a JSON of all users that meet the criteria
                res.json(users);
			}
        });
    });

    // DELETE Routes (Dev Only)
    // --------------------------------------------------------
    // Delete a User off the Map based on objID
    router.delete('/users/:objID', function(req, res,next){
        var objID = req.params.objID;
        var update = req.body;

        User.findByIdAndRemove(objID, update, function(err, user){
            if(err){
                res.send(err);

			}
            else{
                res.json(req.body);
			}
        });
    });
	
function getQuery(rdfType,callback){
    var endpoint = "http://opendata.cs.pub.ro/repo/sparql/select";
    var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
            PREFIX geo:<http://www.w3.org/2003/01/geo/wgs84_pos#> \
            SELECT ?place ?placeName ?lat ?long \
            { \
                ?place rdf:type ?rdfType . \
                ?place rdfs:label ?placeName . \
                ?place geo:lat ?lat . \
                ?place geo:long ?long \
            }";
    //query="";
    var client = new SparqlClient(endpoint);
    //console.log("Query to " + endpoint);
    //console.log("Query: " + query);
    client.query(query)
      .bind('rdfType', rdfType)
      //.bind('city', 'db:Tokyo')
      //.bind('city', 'db:Casablanca')
      //.bind('city', '<http://dbpedia.org/resource/Vienna>')
    .execute(function(error, results) {
        if(error){
            callback(error);
        }
        else{
            var resp=[];
            if (!results.results){callback(null,{results:[],total:0});return;}
            for (var i=0;i<results.results.bindings.length;i++)
            {
                var res=results.results.bindings[i];
                var obj={
                    name: res.placeName.value,
                    lat:  parseFloat(res.lat.value),
                    long: parseFloat(res.long.value),
                    id:   res.place.value
                };
                resp.push(obj);
            }
            callback(null,{results:resp,total:resp.length});
            //console.log("%j",{museums:resp});
            //next();
        }
    });
}

function getQueryParams(params,callback){
    //params = {dist, coord:{lat,long}, limit, rdfType}
    
    var phi0=45;
    var constP = Math.cos(phi0)*Math.sin(phi0)*Math.PI/180;
    var constL = Math.cos(phi0)*(Math.cos(phi0)-Math.sin(phi0)*Math.PI/180*(params.coord.lat-2*phi0));
    var brgrad = 111.1949;
    var dist=(params.dist/brgrad)*(params.dist/brgrad);


    var endpoint = "http://opendata.cs.pub.ro/repo/sparql/select";
    var query ="PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>   \
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>   \
                SELECT ?place ?placeName ?lat ?long (  \
                    (( ?latS -xsd:float(?lat))*( ?latS -xsd:float(?lat)) + \
                    ( ?longS -xsd:float(?long))*( ?longS -xsd:float(?long))* \
                    ( ?constL -( ?constP *xsd:float(?lat))))  \
                    AS ?d2brgrad) \
                WHERE { \
                    ?place rdf:type ?rdfType . \
                    ?place rdfs:label ?placeName . \
                    ?place geo:lat  ?lat . \
                    ?place geo:long ?long . \
                FILTER(  \
                    ( ?latS -xsd:float(?lat))*( ?latS -xsd:float(?lat)) +  \
                    ( ?longS -xsd:float(?long))*( ?longS -xsd:float(?long))* \
                    ( ?constL -( ?constP *xsd:float(?lat))) < ?dist ) \
                    } \
                ORDER BY ASC(?d2brgrad) LIMIT ?limit \
    ";
    //query="";
    var client = new SparqlClient(endpoint);
    //console.log("Query to " + endpoint);
    //console.log("Query: " + query);
    client.query(query)
      .bind('latS', params.coord.lat)
      .bind('longS', params.coord.long)
      .bind('constL',constL)
      .bind('constP', constP)
      .bind('dist', dist)
      .bind('limit', params.limit)
      .bind('rdfType', params.rdfType)
    .execute(function(error, results) {
        if(error){
            callback(error);
        }
        else{
            var resp=[];
            if (!results.results){callback(null,{results:[],total:0});return;}
            for (var i=0;i<results.results.bindings.length;i++)
            {
                var res=results.results.bindings[i];
                var dist_new=parseFloat(res.d2brgrad.value);
                var dist_km=Math.sqrt(dist_new)*brgrad;
                var obj={
                    name: res.placeName.value,
                    lat:  parseFloat(res.lat.value),
                    long: parseFloat(res.long.value),
                    dist: dist_km,
                    id:   res.place.value
                };
                resp.push(obj);
            }
            callback(null,{results:resp,total:resp.length});
            //console.log("%j",{museums:resp});
            //next();
        }
    });
}

function getInfo(params,callback)
{
    var begin_url="http://opendata.cs.pub.ro/repo/resource?uri="
    var end_url  ="&format=application/rdf%2Bjson";
    var url="";
    var global_obj=null;
    async.waterfall([
    function(callbackW){
        console.log("[getInfo]url="+params.url);
        url=begin_url+params.url+end_url;
        request(url, function (error, response, body) {
            var obj={};
            if (error){callbackW(error);return;}
            body=JSON.parse(body);
            var resp=body[params.url];
            for (var key in resp){
                var value=resp[key][0].value;
                if (key.indexOf("#")!=-1){
                    var key_new=key.substring(key.indexOf("#")+1);
                    obj[key_new]=value;
                }
            }
            global_obj=obj;
            var key="http://opendata.cs.pub.ro/property/institutie_in_localitate";
            if (resp[key])
            {
                var value=resp[key][0].value;
                callbackW(null,value);
            }
            else callbackW({message: "localitate not found"});
        });  
    },
    function(urlInst,callbackW) {
        console.log("[getInfo]urlI="+urlInst);
        url=begin_url+urlInst+end_url;
        request(url, function (error, response, body) {
            if (error){callbackW(error);return;}
            body=JSON.parse(body);
            var resp=body[urlInst];
            var key="http://www.w3.org/2002/07/owl#sameAs";
            if (resp[key])
            {
                var value=resp[key][0].value;
                callbackW(null,value);
            }
            else callbackW({message: "sameAs not found"});
        });
    },
    function(urlSameAs, callbackW) {
        console.log("[getInfo]urlS="+urlSameAs);
        url=begin_url+urlSameAs+end_url;
        request(url, function (error, response, body) {
            if (error){callbackW(error);return;}
            body=JSON.parse(body);
            var resp=body[urlSameAs];
            var key="http://www.geonames.org/ontology#population";
            if (resp[key])
            {
                var value=resp[key][0].value;
                callbackW(null,value);
            }
            else callbackW({message: "population not found"});
        });
    }
    ], function (err, result) {
        if (err){
            if (global_obj){
                callback(null,global_obj);
            }
            else callback(err);
        }
        else {
            global_obj.population=result;
            callback(null,global_obj);
        }
    });
   
}

    router.post('/getResource',function(req,res,next){
        var params=req.body;
        getInfo(params,function(err,result){
            if (err){res.json({keys:{}})}
            else {
                console.log(result);
                res.json({keys:result});
            }
        });
    });

    router.get('/museums',function(req,res,next){
       getQuery("<http://dbpedia.org/ontology/Museum>",function(error,result){
            if(error){
                res.send(error);
            }
            else{
                res.json(result);
            }
       });
    });
	
	router.get('/hospitals',function(req,res,next){
       getQuery("<http://dbpedia.org/ontology/Hospital>",function(error,result){
            if(error){
                res.send(error);
            }
            else{
                res.json(result);
            }
       });
    });
	
	router.get('/pharmacies',function(req,res,next){
        getQuery("<http://opendata.cs.pub.ro/ontology/Pharmacy>",function(error,result){
            if(error){
                res.send(error);
            }
            else{
                res.json(result);
            }
       });
    });

    router.post('/queryMuseums',function(req,res,next){
        var params = req.body;
        params.rdfType="<http://dbpedia.org/ontology/Museum>";
        getQueryParams(params,function(error,result){
            if(error){
                res.send(error);
            }
            else{
                res.json(result);
            }
       });
    });

    router.post('/queryPharmacies',function(req,res,next){
        var params = req.body;
        params.rdfType="<http://opendata.cs.pub.ro/ontology/Pharmacy>";
        getQueryParams(params,function(error,result){
            if(error){
                res.send(error);
            }
            else{
                res.json(result);
            }
       });
    });

    router.post('/queryHospitals',function(req,res,next){
        var params = req.body;
        params.rdfType="<http://dbpedia.org/ontology/Hospital>";
        getQueryParams(params,function(error,result){
            if(error){
                res.send(error);
            }
            else{
                res.json(result);
            }
       });
    });

};
