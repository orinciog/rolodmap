// Creates the addCtrl Module and Controller. Note that it depends on 'geolocation' and 'gservice' modules.
var museumCtrl = angular.module('museumCtrl', ['geolocation', 'gservice']);
museumCtrl.controller('museumCtrl', function($scope, $http, $rootScope, geolocation, gservice){

     // Initializes Variables
    // ----------------------------------------------------------------------------
    $scope.formData = {};
    var queryBody = {};

    // Functions
    // ----------------------------------------------------------------------------
	$scope.formData.longitude = 26.0946376;
    $scope.formData.latitude = 44.4378258;
	$scope.formData.distance = 10;
    $scope.formData.limit = 10;
    // Get User's actual coordinates based on HTML5 at window load
    geolocation.getLocation().then(function(data){
        coords = {lat:data.coords.latitude, long:data.coords.longitude};

        // Set the latitude and longitude equal to the HTML5 coordinates
        $scope.formData.longitude = parseFloat(coords.long).toFixed(3);
        $scope.formData.latitude = parseFloat(coords.lat).toFixed(3);
    });

    // Get coordinates based on mouse click. When a click event is detected....
    $rootScope.$on("clicked", function(){

        // Run the gservice functions associated with identifying coordinates
        $scope.$apply(function(){
            $scope.formData.latitude = parseFloat(gservice.clickLat).toFixed(3);
            $scope.formData.longitude = parseFloat(gservice.clickLong).toFixed(3);
        });
    });
	
	$scope.init = function(){
		$http.get('/api/museums').then(
					function(response) {
						
						if (response.status!=200){}
						else if (!response.data.results) {}
						else {
							var resp=response.data;
							 // Pass the filtered results to the Google Map Service and refresh the map
							gservice.refresh(queryBody.latitude, queryBody.longitude, resp.results);

							// Count the number of records retrieved for the panel-footer
							$scope.queryCount = resp.total;
							//console.log(resp.results);
						}
					},
					function(error, status){
						console.log("error "+JSON.stringify(error));
						console.log("error "+status);
					}	
				);
	}

    // Take query parameters and incorporate into a JSON queryBody
    $scope.query = function(){

        // Assemble Query Body
        queryBody = {
            coord:{
                long: parseFloat($scope.formData.longitude),
                lat: parseFloat($scope.formData.latitude)
            },
            dist: parseFloat($scope.formData.distance),
            limit: $scope.formData.limit
        };
		
        //console.log("Query");
		//console.log(queryBody);
        // Post the queryBody to the /query POST route to retrieve the filtered results
        $http.post('/api/queryMuseums', queryBody).then(
                    function(response) {
                        
                        if (response.status!=200){}
                        else if (!response.data.results) {}
                        else {
                            var resp=response.data;
                             // Pass the filtered results to the Google Map Service and refresh the map
                            gservice.refresh(queryBody.latitude, queryBody.longitude, resp.results);

                            // Count the number of records retrieved for the panel-footer
                            $scope.queryCount = resp.total;
                            //console.log(resp.results);
                        }
                    },
                    function(error, status){
                        console.log("error "+JSON.stringify(error));
                        console.log("error "+status);
                    }   
                );
    };
	
	$scope.init();
});

