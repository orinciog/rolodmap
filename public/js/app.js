// Declares the initial angular module "meanMapApp". Module grabs other controllers and services.
var app = angular.module('meanMapApp', ['museumCtrl','pharmacyCtrl','hospitalCtrl', 'initCtrl', 'headerCtrl', 'geolocation', 'gservice', 'ngRoute'])

    // Configures Angular routing -- showing the relevant view and controller when needed.
    .config(function($routeProvider){

        // Join Team Control Panel
        $routeProvider.when('/museums', {
            controller: 'museumCtrl',
            templateUrl: 'partials/museumForm.html'
		
		}).when('/hospitals', {
            controller: 'hospitalCtrl',
            templateUrl: 'partials/hospitalForm.html'

		}).when('/pharmacies', {
            controller: 'pharmacyCtrl',
            templateUrl: 'partials/pharmacyForm.html'
			
        // Find Teammates Control Panel
        }).when('/init', {
            controller: 'initCtrl',
            templateUrl: 'partials/initForm.html'

        // All else forward to the Join Team Control Panel
        }).otherwise({redirectTo:'/init'})
    });
