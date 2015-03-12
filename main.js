require('cloud/app.js');
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

Parse.Cloud.job("updateCities", function(request, status){
	var service = request.params.service;
	Parse.Cloud.httpRequest({
		url: 'http://lyftvsuber.herokuapp.com/'+service+'/cities/',
		success: function(response) {
			console.log(response.data);

			var City = Parse.Object.extend("City");
			var query = new Parse.Query(City);

			var cityList = {};
			console.log("querying cities from parse");
			query.find({
			    success: function (citiesInParse) {
			    	console.log("building city list from source: " + response.data.length + " items");
					Array.prototype.forEach.call(response.data, function(e,i){
						var addCity = new City({
							state: e.state, 
							name: e.name,
							lyft_url: e.href,
							uber_url: e.href
						});
						cityList[e.name+e.state] = addCity;
					});
					console.log("city list built");
					console.log("inserting existing cities from parse: "+ response.data.length + " items");
			        for (var i = 0; i < citiesInParse.length; i++) {
			            // Iteratoration for class object.
			            cityList[citiesInParse[i].get("name")+citiesInParse[i].get("state")] = citiesInParse[i];
			        }
			        console.log("finished city list");

					var cityFinal = [];
					for(key in cityList){ 
						if(cityList.hasOwnProperty(key)){
							cityFinal.push(cityList[key]);
						}
					}

					Parse.Object.saveAll(cityFinal, {
						success: function(list) {
						// All the objects were saved.
						console.log("Saved " + list.length + " items");
						status.success("Http Request Successful");
						
						},
						error: function(error) {
						// An error occurred while saving one of the objects.
						console.log("Error: " + error.code + " " + error.message);
						status.error("Http Request Error");
						},
					});


			    },
			    error: function (error) {
			        console.log("Error: " + error.code + " " + error.message);
			        status.error("Http Request Error");
			    }
			});
		},
		error: function(response) {
			console.error('Request failed with response code ' + response.status);
			status.error("Http Request Error");
		}
	});
});





// Parse.Cloud.job("updatePrices", function(request, status){
// 	var service = request.params.service;

// 	var City = Parse.Object.extend("City");
// 	var query = new Parse.Query(City);

// 	var city;
// 	console.log("querying cities from parse");
// 	query.ascending("price_updated_at");
// 	query.first(
// 	    success: function (cityResult) {
// 	    	if(cityResult != undefined){
// 	    		console.log("updating prices for city: " + cityResult.get("name") + ", " + cityResult.get("state"));
// 	    		city = cityResult;
// 	    	}
// 	    },
// 	    error: function (error) {
// 	        console.log("Error: " + error.code + " " + error.message);
// 	        status.error("Http Request Error");
// 	    }
// 	});

// 	Parse.Cloud.httpRequest({
// 		url: 'http://lyftvsuber.herokuapp.com/'+service+'/cities/'+city.get("name"),
// 		success: function(response) {
// 			console.log(response.data);

// 			var City = Parse.Object.extend("City");
// 			var query = new Parse.Query(City);

// 			var cityList = {};
// 			console.log("querying cities from parse");
// 			query.find({
// 			    success: function (citiesInParse) {
// 			    	console.log("building city list from source: " + response.data.length + " items");
// 					Array.prototype.forEach.call(response.data, function(e,i){
// 						var addCity = new City({
// 							state: e.state, 
// 							name: e.name,
// 							lyft_url: e.href,
// 							uber_url: e.href
// 						});
// 						cityList[e.name+e.state] = addCity;
// 					});
// 					console.log("city list built");
// 					console.log("inserting existing cities from parse: "+ response.data.length + " items");
// 			        for (var i = 0; i < citiesInParse.length; i++) {
// 			            // Iteratoration for class object.
// 			            cityList[citiesInParse[i].get("name")+citiesInParse[i].get("state")] = citiesInParse[i];
// 			        }
// 			        console.log("finished city list");

// 					var cityFinal = [];
// 					for(key in cityList){ 
// 						if(cityList.hasOwnProperty(key)){
// 							cityFinal.push(cityList[key]);
// 						}
// 					}

// 					Parse.Object.saveAll(cityFinal, {
// 						success: function(list) {
// 						// All the objects were saved.
// 						console.log("Saved " + list.length + " items");
// 						status.success("Http Request Successful");
						
// 						},
// 						error: function(error) {
// 						// An error occurred while saving one of the objects.
// 						console.log("Error: " + error.code + " " + error.message);
// 						status.error("Http Request Error");
// 						},
// 					});


// 			    },
// 			    error: function (error) {
// 			        console.log("Error: " + error.code + " " + error.message);
// 			        status.error("Http Request Error");
// 			    }
// 			});
// 		},
// 		error: function(response) {
// 			console.error('Request failed with response code ' + response.status);
// 			status.error("Http Request Error");
// 		}
// 	});
// });

// Parse.Cloud.beforeSave("City", function(request, response) {
//   var query = new Parse.Query("City");
//   query.equalTo("name", request.object.get("name"));
//   query.equalTo("state", request.object.get("state"));
//   query.first({
//     success: function(city) {
//       console.log("City query success");
//       if (city != undefined) {
//         console.log("city exists");
//         console.log(city);
//         response.error(temp);
//       } else {
//         // no existing temp was found, so we must create it
//         response.success()
//       }
//     },
//     error: function(error) {
//       response.error(error);
//     }
//   });
// });
