var express = require('express');
var app = express();
var mongoose = require('mongoose');
var MONGODBURL = 'mongodb://davidtsang.cloudapp.net:27017/assignment';
var bodyParser = require('body-parser');
var restaurantSchema = require('./models/restaurant');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//testing method testing
app.get('/', function(req,res) {
	console.log('Incoming request: GET');
	console.log('Request body: ', req.body);
	console.log('name: ', req.params.name);
	res.end('Connection closed (testing method)',200);
});

app.post('/', function(req,res) {  /*  create or insert an document  */
	var r = {};
	r.address = {};
	r.address.building = req.body.building;
	r.address.street = req.body.street;
	r.address.zipcode = req.body.zipcode;
	r.address.coord = [];
	var rlon = parseFloat(req.body.lon);
	var rlat = parseFloat(req.body.lat);
	r.address.coord.push(rlon);
	r.address.coord.push(rlat);
	r.borough = req.body.borough;
	r.cuisine = req.body.cuisine;
	r.name = req.body.name;
	r.restaurant_id = req.body.restaurant_id;

	mongoose.connect(MONGODBURL);
	var db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function (callback) {
		var Restaurant = mongoose.model('Restaurant', restaurantSchema);
		var rest = new Restaurant(r);
		rest.save(function(err) {
			if (err) {
				res.status(500).json(err);
				throw err
			}
			else {
				console.log('Created:' + rest + '\n' + req.body);
				res.status(200).json({message: 'insert done', id: rest._id});
				db.close();
				//res.end();
			}
		});
	});
});

app.get('/all',function(req,res) {    /* find all documents */
	mongoose.connect(MONGODBURL);
	var db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function (callback) {
		var Restaurant = mongoose.model('Restaurant', restaurantSchema);
		Restaurant.find(function(err,results) {
			if (err) {
				console.log("Error: " + err.message);
				res.write(err.message);
			}
			else {
				console.log('Found: ',results.length);
				for (var i=0;i<results.length;i++)
					res.write(JSON.stringify(results[i])+'\n');
				
			}
			res.end();
			db.close();
		});
	});
});

app.get('/grades/score/:field/:value', function(req,res) {   /* find document from the range of grades.score  */
	var selection = {};
	if (isNaN(req.params.value)) 
		res.end("The input is not a number.", 200);
	else {
		if (req.params.field=="gt")
			selection.grades = { $elemMatch : { score: { $gt: parseFloat(req.params.value) } } };
		else if (req.params.field=="gte")
			selection.grades = { $elemMatch : { score: { $gte: parseFloat(req.params.value) } } };
		else if (req.params.field=="lt")
			selection.grades = { $elemMatch : { score: { $lt: parseFloat(req.params.value) } } };
		else if (req.params.field=="lte")
			selection.grades = { $elemMatch : { score: { $lte: parseFloat(req.params.value) } } };
	
		mongoose.connect(MONGODBURL);
		var db = mongoose.connection;
		db.on('error', console.error.bind(console, 'connection error:'));
		db.once('open', function (callback) {
			var Restaurant = mongoose.model('Restaurant', restaurantSchema);
			Restaurant.find(selection,function(err, results){
				if (err) {
					res.status(500).json(err);
					throw err
				}
				if (results.length > 0) {
					res.status(200).json(results);
					/*for (var i=0; i<results.length; i++) {
						console.log(JSON.stringify(results[i]) + '\n');
						res.write(results[i] + '\n');
					}*/
				}
				else {
					res.status(200).json({message: 'No matching document'});
				}
				db.close();
			});
		});	
	}
});

app.get('/insert/*',function(req,res) {    /* insert document by any number of criteria ---USELESS---*/
	var path = req.path;
	path = req.path.slice(8,req.path.length);
	var string_array = path.split("/");
	var string = [];
	var count = 0;
	for (var i=0;i<string_array.length;i++) {
		if (string_array[i].length >0)
			string[count++] = string_array[i];		
	}		
	if (string.length % 2 != 0) {	
		res.end('Not enough data! \n', 200);	
	}
	else {
		var criteria = {};
		criteria.address = {};
		for (var i=0; i<string.length;i=i+2) {
			if (string[i]=="building"||string[i]=="street"||string[i]=="zipcode") 
				criteria.address[string[i]] = string[i+1];		
			else if (string[i]=="lon" && !isNaN(string[i+1])) 
				criteria["address.coord.0"] = parseFloat(string[i+1]);
			else if (string[i]=="lat" && !isNaN(string[i+1])) 
				criteria["address.coord.1"] = parseFloat(string[i+1]);
			else
				criteria[string[i]] = string[i+1];
		}
		mongoose.connect(MONGODBURL);
		var db = mongoose.connection;
		db.on('error', console.error.bind(console, 'connection error:'));
		db.once('open', function (callback) {
			var Restaurant = mongoose.model('Restaurant', restaurantSchema);
			var rest = new Restaurant(criteria);
			rest.save(function(err) {
				if (err) {
					res.status(500).json(err);
					throw err
				}
				else {
					console.log('Created:' + rest + '\n' + req.body);
					res.status(200).json({message: 'insert done', id: rest._id});
					db.close();
					//res.end();
				}
			});
		});
	}
});

app.get('/or/*', function(req,res) {   /* find document by or  */
	var path = req.path.slice(4,req.path.length);
	var string_array = path.split("/");
	var string = [];
	var count = 0;
	for (var i=0;i<string_array.length;i++) {
		if (string_array[i].length >0)
			string[count++] = string_array[i];		
	}		
	if (string.length==0 || string.length % 2 != 0) {
		res.write("Incomplete data input! \n");
		console.log("Incomplete data input! \n");
	} else {
		var selection = [];
		for (var i=0; i<string.length;i=i+2) {
			var criteria = {};
			if (string[i]=="date")
				criteria.grades = { $elemMatch : { date: string[i+1] } };
			else if (string[i]=="grade")
				criteria.grades = { $elemMatch : { grade: string[i+1] } };
			else if (string[i]=="score" && !isNaN(string[i+1]))
				criteria.grades = { $elemMatch : { score: parseFloat(string[i+1]) } };	
			else if (string[i]=="building"||string[i]=="street"||string[i]=="zipcode") 
				criteria["address."+string[i]] = string[i+1];		
			else if (string[i]=="lon" && !isNaN(string[i+1])) 
				criteria["address.coord.0"] = parseFloat(string[i+1]);
			else if (string[i]=="lat" && !isNaN(string[i+1])) 
				criteria["address.coord.1"] = parseFloat(string[i+1]);
			else
				criteria[string[i]] = string[i+1];
			selection.push(criteria);
		}
		mongoose.connect(MONGODBURL);
		var db = mongoose.connection;
		db.on('error', console.error.bind(console, 'connection error:'));
		db.once('open', function (callback) {
			var Restaurant = mongoose.model('Restaurant', restaurantSchema);
			Restaurant.find({$or:selection},function(err, results){
				if (err) {
					res.status(500).json(err);
					throw err
				}
				if (results.length > 0) {
					res.status(200).json(results);
				}
				else {
					res.status(200).json({message: 'No matching document'});
				}
				db.close();
			});
		});
	}	
});

app.get('/find/*',function(req,res) {    /* retrieve document by any number of criteria */
	var path = req.path;
	path = req.path.slice(6,req.path.length);
	var string_array = path.split("/");
	var string = [];
	var count = 0;
	for (var i=0;i<string_array.length;i++) {
		if (string_array[i].length > 0)
			string[count++] = string_array[i];		
	}		
	if (string.length % 2 != 0) {
		res.end("Incomplete data input! \n", 200);
		console.log("Incomplete data input! \n");
	} 
	else {
		var selection = [];
		for (var i=0; i<string.length;i=i+2) {
			var criteria = {};
			if (string[i]=="date")
				criteria.grades = { $elemMatch : { date: string[i+1] } };
			else if (string[i]=="grade")
				criteria.grades = { $elemMatch : { grade: string[i+1] } };
			else if (string[i]=="score" && !isNaN(string[i+1]))
				criteria.grades = { $elemMatch : { score: parseFloat(string[i+1]) } };	
			else if (string[i]=="building"||string[i]=="street"||string[i]=="zipcode") 
				criteria["address."+string[i]] = string[i+1];		
			else if (string[i]=="lon" && !isNaN(string[i+1])) 
				criteria["address.coord.0"] = parseFloat(string[i+1]);
			else if (string[i]=="lat" && !isNaN(string[i+1])) 
				criteria["address.coord.1"] = parseFloat(string[i+1]);
			else
				criteria[string[i]] = string[i+1];
			selection.push(criteria);
		}
		mongoose.connect(MONGODBURL);
		var db = mongoose.connection;
		db.on('error', console.error.bind(console, 'connection error:'));
		db.once('open', function (callback) {
			var Restaurant = mongoose.model('Restaurant', restaurantSchema);
			Restaurant.find({$and: selection}, function(err,results) {
				if (err) {
					console.log("Error: " + err.message);
					res.write(err.message);
				}
				else if (results.length > 0){
					res.status(200).json(results);
					for (var i=0; i<results.length; i++) {
						console.log(JSON.stringify(results[i]) + '\n');
						res.write(results[i] + '\n');
					}
					res.end();
					db.close();
				}
				else {
					res.status(200).json({message: 'No matching document'});
				}
			});
		});
	}
});

app.put('/grades/*', function(req,res) {   /* push an grades object with any criteria */
	var path = req.path;
	path = req.path.slice(8,req.path.length);
	var string_array = path.split("/");
	var selection = {};
	for (var i=0;i<string_array.length;i=i+2) {
		if (string_array[i]=="date")
				selection.grades = { $elemMatch : { date: string_array[i+1] } };
		else if (string_array[i]=="grade")
				selection.grades = { $elemMatch : { grade: string_array[i+1] } };
		else if (string_array[i]=="score" && !isNaN(string_array[i+1]))
				selection.grades = { $elemMatch : { score: parseFloat(string_array[i+1]) } };	
		else if (string_array[i]=="building"||string_array[i]=="street"||string_array[i]=="zipcode") 
				selection["address."+string_array[i]] = string_array[i+1];		
		else if (string_array[i]=="lon" && !isNaN(string_array[i+1])) 
				selection["address.coord.0"] = parseFloat(string_array[i+1]);
		else if (string_array[i]=="lat" && !isNaN(string_array[i+1])) 
				selection["address.coord.1"] = parseFloat(string_array[i+1]);
		else
			selection[string_array[i]] = string_array[i+1];		
	}
	
	if (!req.body.date||!req.body.grade||!req.body.score) {
		res.end("Not enough data input! \n", 200);
	}
	else {	
		var criteria = {};
		criteria.date = req.body.date;
		criteria.grade = req.body.grade;
		if (!isNaN(req.body.score)) criteria.score = req.body.score;
	
		mongoose.connect(MONGODBURL);
		var db = mongoose.connection;
		db.on('error', console.error.bind(console, 'connection error:'));
		db.once('open', function (callback) {
			var Restaurant = mongoose.model('Restaurant', restaurantSchema);
			Restaurant.update(selection,{ $push:{ grades:criteria } },function(err){
				if (err) {
					console.log("Error: " + err.message);
					res.write(err.message);
				}
				else {
					console.log('Inserted: '+criteria+" into "+selection);
					res.write('Update Succeed \n');
					db.close();
					res.end();
				}
			});
		});
	}
});

app.put('/grades_pull/*', function(req,res) {   /* pull an grades object with any criteria */
	var path = req.path;
	path = req.path.slice(13,req.path.length);
	var string_array = path.split("/");
	var selection = {};
	for (var i=0;i<string_array.length;i=i+2) {
		if (string_array[i]=="date")
				selection.grades = { $elemMatch : { date: string_array[i+1] } };
		else if (string_array[i]=="grade")
				selection.grades = { $elemMatch : { grade: string_array[i+1] } };
		else if (string_array[i]=="score" && !isNaN(string_array[i+1]))
				selection.grades = { $elemMatch : { score: parseFloat(string_array[i+1]) } };	
		else if (string_array[i]=="building"||string_array[i]=="street"||string_array[i]=="zipcode") 
				selection["address."+string_array[i]] = string_array[i+1];		
		else if (string_array[i]=="lon" && !isNaN(string_array[i+1])) 
				selection["address.coord.0"] = parseFloat(string_array[i+1]);
		else if (string_array[i]=="lat" && !isNaN(string_array[i+1])) 
				selection["address.coord.1"] = parseFloat(string_array[i+1]);
		else
			selection[string_array[i]] = string_array[i+1];		
	}

	var criteria = {};
	if (req.body.date) criteria.date = req.body.date;
	if (req.body.grade) criteria.grade = req.body.grade;
	if (req.body.score && !isNaN(req.body.score)) criteria.score = req.body.score;

	mongoose.connect(MONGODBURL);
	var db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function (callback) {
		var Restaurant = mongoose.model('Restaurant', restaurantSchema);
		Restaurant.update(selection,{ $pull:{ grades:criteria } },function(err){
			if (err) {
				console.log("Error: " + err.message);
				res.write(err.message);
			}
			else {
				console.log('Inserted: '+criteria+" into "+selection);
				res.write('Update Succeed \n');
				db.close();
				res.end();
			}
		});
	});
});

app.put('/*', function(req,res) {   /* update document with more than one criteria and one value  */
	var path = req.path.slice(1,req.path.length);
	if (JSON.stringify(req.body)!="{}" && path.length>0) {
		var string_array = path.split("/");
		var selection = {};
		for (var i=0;i<string_array.length;i=i+2) {
			if (string_array[i]=="date")
				selection.grades = { $elemMatch : { date: string_array[i+1] } };
			else if (string_array[i]=="grade")
				selection.grades = { $elemMatch : { grade: string_array[i+1] } };
			else if (string_array[i]=="score" && !isNaN(string_array[i+1]))
				selection.grades = { $elemMatch : { score: parseFloat(string_array[i+1]) } };	
			else if (string_array[i]=="building"||string_array[i]=="street"||string_array[i]=="zipcode") 
				selection["address."+string_array[i]] = string_array[i+1];		
			else if (string_array[i]=="lon" && !isNaN(string_array[i+1])) 
				selection["address.coord.0"] = parseFloat(string_array[i+1]);
			else if (string_array[i]=="lat" && !isNaN(string_array[i+1])) 
				selection["address.coord.1"] = parseFloat(string_array[i+1]);
			else
				selection[string_array[i]] = string_array[i+1];		
		}
	
		var body = JSON.stringify(req.body);
		var string = body.slice(1,body.length-1);
		var string_array = string.split(",");
		var criteria = {};
		for (var i=0;i<string_array.length;i++) {
			var string_item = string_array[i].split(":");

			string_item[0] = string_item[0].slice(1,string_item[0].length-1);
			string_item[1] = string_item[1].slice(1,string_item[1].length-1);
			if (string_item[0]=="building"||string_item[0]=="street"||string_item[0]=="zipcode") 
				criteria["address."+string_item[0]] = string_item[1];		
			else if (string_item[0]=="lon" && !isNaN(string_item[1])) 
				criteria["address.coord.0"] = parseFloat(string_item[1]);
			else if (string_item[0]=="lat" && !isNaN(string_item[1])) 
				criteria["address.coord.1"] = parseFloat(string_item[1]);
			else if (string_item[0]=="date") 
				criteria["grades.$.date"] = string_item[1];
			else if (string_item[0]=="grade") 
				criteria["grades.$.grade"] = string_item[1];
			else if (string_item[0]=="score" && !isNaN(string_item[1])) 
				criteria["grades.$.score"] = parseFloat(string_item[1]);
			else
				criteria[string_item[0]] = string_item[1];
		}	
		mongoose.connect(MONGODBURL);
		var db = mongoose.connection;
		db.on('error', console.error.bind(console, 'connection error:'));
		db.once('open', function (callback) {
			var Restaurant = mongoose.model('Restaurant', restaurantSchema);
			Restaurant.update(selection,{$set:criteria},function(err){
				if (err) {
					console.log("Error: " + err.message);
					res.write(err.message);
				}
				else {
					console.log('Updated: ', selection);
					res.write('Update Succeed');
					db.close();
					res.end();
				}
			});
		});
	}
	else {
		res.end("No update data. Please input again. \n", 200);
		console.log("No update data.\n");		
	}
});

app.delete('/*',function(req,res) {  /* delete all documents by inputting any criteria */
		
	var path = req.path.slice(1,req.path.length);
	if (path.length<1) res.end("No data input \n", 200);

	else {
		var string_array = path.split("/");
		var selection = {};
		for (var i=0;i<string_array.length;i=i+2) {
			if (string_array[i]=="date")
				selection.grades = { $elemMatch : { date: string_array[i+1] } };
			else if (string_array[i]=="grade")
				selection.grades = { $elemMatch : { grade: string_array[i+1] } };
			else if (string_array[i]=="score" && !isNaN(string_array[i+1]))
				selection.grades = { $elemMatch : { score: parseFloat(string_array[i+1]) } };	
			else if (string_array[i]=="building"||string_array[i]=="street"||string_array[i]=="zipcode") 
				selection["address."+string_array[i]] = string_array[i+1];		
			else if (string_array[i]=="lon" && !isNaN(string_array[i+1])) 
				selection["address.coord.0"] = parseFloat(string_array[i+1]);
			else if (string_array[i]=="lat" && !isNaN(string_array[i+1])) 
				selection["address.coord.1"] = parseFloat(string_array[i+1]);
			else
				selection[string_array[i]] = string_array[i+1];		
		} 	

		mongoose.connect(MONGODBURL);
		var db = mongoose.connection;
		db.on('error', console.error.bind(console, 'connection error:'));
		db.once('open', function (callback) {
			var Restaurant = mongoose.model('Restaurant', restaurantSchema);
			Restaurant.find(selection).remove(function(err) {
     	  		if (err) {
					res.status(500).json(err);
					throw err
				}
				console.log('Deleted: ', selection);
     	  		db.close();
				res.status(200).json({message: 'delete done', name: selection});
    		});
    	});
	}
});

app.listen(process.env.PORT || 8099);

