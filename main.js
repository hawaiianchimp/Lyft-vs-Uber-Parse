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

Parse.Cloud.job("updatePrices", function(request, status){
	var service = request.params.service
	var City = Parse.Object.extend("City");
	var queryCity = new Parse.Query(City);
	var city;

	console.log("querying cities from parse");
	queryCity.ascending("price_updated_at");
	queryCity.first({
		success: function (cityResult) {
			console.log("found city result " + cityResult.get("name"));
	    	if(cityResult != undefined){
	    		console.log("updating prices for city: " + cityResult.get("name") + ", " + cityResult.get("state"));
	    		city = cityResult;
				var prices = city.relation("prices");
	    		city.save({
	    			"price_updated_at": new Date()
	    		},
	    		{
	    			success: function(result){
	    				console.log("Saved " + result.get("name"));
	    			}, 
	    			error: function(error){
	    				status.error("Http Request Error, could not save new price_updated_at " + error.message );
	    			}
	    		});
	    		var requestURL = 'http://lyftvsuber.herokuapp.com/'+service+city.get("lyft_url");
	    		console.log("Requesting: " + requestURL);
	    		Parse.Cloud.httpRequest({
					url: requestURL,
					success: function(response) {
						//console.log(response.data);
						var Price = Parse.Object.extend("Price");
						var priceList = {};
						console.log("querying prices from city in parse");
						var queryPrice = prices.query();
						queryPrice.find({
							success: function(objectsInPrices){
								if(objectsInPrices.length === 0){
									console.log("No Prices yet");
								}
								else{
									console.log(objectsInPrices.length +" current prices");

									for (var i = objectsInPrices.length - 1; i >= 0; i--) {
										console.log("priceList[" + objectsInPrices[i].get("service")+"-"+objectsInPrices[i].get("size")+"] = objectsInPrices[i];");
										priceList[objectsInPrices[i].get("service")+"-"+objectsInPrices[i].get("size")] = objectsInPrices[i];
									};
									console.log("priceList built");

									for (var i = objectsInPrices.length - 1; i >= 0; i--) {
										prices.remove(objectsInPrices[i]);
									};
									console.log("current Price Relations removed");
								}

								Array.prototype.forEach.call(response.data, function(e,i){
									var compareItem = priceList[e.service+"-"+e.size];
									var addPrice = new Price(e);
									addPrice.set("city", city);
									addPrice.set("city_name", city.get("name"));
									console.log("priceList[" + e.service+"-"+e.size+"] = addPrice;");

									if(compareItem != null){
										var change_detected = 1;
										if(compareItem.base != e.base){
											change_detected++;
										}
										if(compareItem.minute != e.minute){
											change_detected++;
										}
										if(compareItem.mile != e.mile){
											change_detected++;
										}
										if(compareItem.extra != e.extra){
											change_detected++;
										}
										if(compareItem.minimum != e.minimum){
											change_detected++;
										}
										if(compareItem.disclaimer_airport != e.disclaimer_airport){
											change_detected++;
										}
										if(compareItem.disclaimer_tolls != e.disclaimer_tolls){
											change_detected++;
										}
										if(compareItem.disclaimer_city != e.disclaimer_city){
											change_detected++;
										}
										if(change_detected > 1){
											if((e.base + e.minute + e.mile + e.extra + e.minimum) > 0){
												console.log("change detected, updating price");
												priceList[e.service+"-"+e.size] = addPrice;									
											}
										}
									}
									else{
										console.log("No changes detected, not storing information");
									}
								});

						    	console.log("building prices list for city "+ city.get("name")+" from source: " + response.data.length + " items");
								
								
						        console.log("finished price list");

								var priceFinal = [];
								for(key in priceList){ 
									if(priceList.hasOwnProperty(key)){
										priceFinal.push(priceList[key]);
									}
								}

								Parse.Object.saveAll(priceFinal, {
									success: function(list) {
									// All the objects were saved.
									
									for (var i = list.length - 1; i >= 0; i--) {
										prices.add(list[i]);
									};

									city.save();

									console.log("Saved " + list.length + " items");
									status.success("Http Request Successful");
									
									},
									error: function(error) {
									// An error occurred while saving one of the objects.
									console.log("Error: " + error.code + " " + error.message);
									status.error("Error: " + error.code + " " + error.message);
									},
								});



							},
							error: function(response) {
								console.error('Query to find City Prices Relation Failed, with code  ' + response.status);
								status.error("Error: " + response.code + " " + response.message);
							}
						});

						
				    },
					error: function(response) {
						console.error('Request failed with response code ' + response.status);
						status.error("Error: " + response.code + " " + response.message);
					}
				});




	    	}
	    },
	    error: function (error) {
	        console.log("Error: " + error.code + " " + error.message);
	        status.error("Http Request Error");
	    }
	});
});

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
