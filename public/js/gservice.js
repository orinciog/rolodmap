// Creates the gservice factory. This will be the primary means by which we interact with Google Maps
angular.module('gservice', [])
    .factory('gservice', function($rootScope, $http){

        // Initialize Variables
        // -------------------------------------------------------------
        // Service our factory will return
        var googleMapService = {};
        googleMapService.clickLat  = 0;
        googleMapService.clickLong = 0;

        // Array of locations obtained from API calls
        var locations = [];

        // Variables we'll use to help us pan to the right spot
        var lastMarker;
        var currentSelectedMarker;

        // User Selected Location (initialize to center of America)
        var selectedLat_g = 44.4378258;
        var selectedLong_g = 26.0946376;

        // Functions
        // --------------------------------------------------------------
        // Refresh the Map with new data. Takes three parameters (lat, long, and filtering results)
        googleMapService.refresh = function(latitude, longitude, filteredResults){

            // Clears the holding array of locations
            locations = [];

            // Set the selected lat and long equal to the ones provided on the refresh() call
            var selectedLat = latitude||selectedLat_g;
            var selectedLong = longitude || selectedLong_g;

            // If filtered results are provided in the refresh() call...
            if (filteredResults){

                // Then convert the filtered results into map points.
                locations = convertToMapPoints(filteredResults);

                // Then, initialize the map -- noting that a filter was used (to mark icons yellow)
                initialize(latitude, longitude, true);
            }

            // If no filter is provided in the refresh() call...
            else {
				initialize(latitude, longitude, false);
/*
                // Perform an AJAX call to get all of the records in the db.
                $http.get('/api/museums').then(
					function(response) {
						console.log("response");
						// Then convert the results into map points
						locations = convertToMapPoints(response.data.museums);
						console.log(locations);
						// Then initialize the map -- noting that no filter was used.
						initialize(latitude, longitude, false);
					},
					function(error, status){
						console.log("error "+JSON.stringify(error));
						console.log("error "+status);
					}	
				);
*/				
            }
        };

        // Private Inner Functions
        // --------------------------------------------------------------

        // Convert a JSON of users into map points
        var convertToMapPoints = function(response){

            // Clear the locations holder
            var locations = [];

            // Loop through all of the JSON entries provided in the response
            for(var i= 0; i < response.length; i++) {
                var res = response[i];
				
                // Create popup windows for each record
                var  contentString = '<p><b>Info</b>: ' + res.name + '</p>';
				if (res.long && res.lat ){
					var longM=res.long;
					var latM=res.lat;
					
					//console.log(longM+" "+latM);
					// Converts each of the JSON records into Google Maps Location format (Note Lat, Lng format).
					locations.push(new Location(
						new google.maps.LatLng(latM, longM),
						new google.maps.InfoWindow({
							content: contentString,
							maxWidth: 320
						}),
						res.id,
                        res.name
					));
				}
            }
            // location is now an array populated with records in Google Maps format
            return locations;
        };

        // Constructor for generic location
        var Location = function(latlon, message, id, label){
            this.latlon = latlon;
            this.message = message;
            this.id = id;
            this.label = label;
        };

        // Initializes the map
        var initialize = function(latitude, longitude, filter) {

            var selectedLat = latitude||selectedLat_g;
            var selectedLong = longitude || selectedLong_g;
			
            var myLatLng = {lat: selectedLat, lng: selectedLong};
			
			//console.log(myLatLng);
            // If map has not been created...
            if (!map){

                // Create a new map and place in the index.html page
                var map = new google.maps.Map(document.getElementById('map'), {
                    zoom: 6,
                    center: myLatLng
                });
            }

            // If a filter was used set the icons yellow, otherwise blue
            if(filter){
                icon = "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
            }
            else{
                icon = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
            }

            // Loop through each location in the array and place a marker
            locations.forEach(function(n, i){
               var marker = new google.maps.Marker({
                   position: n.latlon,
                   map: map,
                   title: "Big Map",
                   icon: icon,
               });

                // For each marker created, add a listener that checks for clicks
                google.maps.event.addListener(marker, 'click', function(e){

                    currentSelectedMarker = n;
                    var obj={url:n.id};
                    $http.post('/api/getResource',obj).then(
                            function(response) {
                                
                                if (response.status==200){
                                    var data=response.data;
                                    var contentString = '<p><b>Info</b>: ' + n.label + '</p><ul>';
                                    for (var key in data.keys){
                                        contentString+="<li><i>"+key+"</i>:"+data.keys[key]+"</li>"
                                    }
                                    var message_new=new google.maps.InfoWindow({
                                        content: contentString,
                                        maxWidth: 320
                                    });
                                    n.message=message_new; 
                                }
                                n.message.open(map, marker);
                            },
                            function(error, status){
                                // When clicked, open the selected marker's message
                                n.message.open(map, marker);
                            }   
                    );
                });
            });

            // Set initial location as a bouncing red marker
            var initialLocation = new google.maps.LatLng(selectedLat, selectedLong);
            var marker = new google.maps.Marker({
                position: initialLocation,
                animation: google.maps.Animation.BOUNCE,
                map: map,
                icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
            });
            lastMarker = marker;

            // Function for moving to a selected location
            map.panTo(new google.maps.LatLng(selectedLat, selectedLong));

            // Clicking on the Map moves the bouncing red marker
            google.maps.event.addListener(map, 'click', function(e){
                var marker = new google.maps.Marker({
                    position: e.latLng,
                    animation: google.maps.Animation.BOUNCE,
                    map: map,
                    icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                });

                // When a new spot is selected, delete the old red bouncing marker
                if(lastMarker){
                    lastMarker.setMap(null);
                }

                // Create a new red bouncing marker and move to it
                lastMarker = marker;
                map.panTo(marker.position);

                // Update Broadcasted Variable (lets the panels know to change their lat, long values)
                googleMapService.clickLat = marker.getPosition().lat();
                googleMapService.clickLong = marker.getPosition().lng();
                $rootScope.$broadcast("clicked");
            });
        };

        // Refresh the page upon window load. Use the initial latitude and longitude
        google.maps.event.addDomListener(window, 'load',
            googleMapService.refresh(selectedLat_g, selectedLong_g));

        return googleMapService;
    });

