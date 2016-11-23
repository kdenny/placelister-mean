var app = angular.module('placelister', ['ui.router']);


app.directive('googleplace', function() {
    return {
        require: 'ngModel',
        link: function(scope, element, attrs, model) {
            var options = {
                types: [],
                componentRestrictions: {}
            };
            scope.gPlace = new google.maps.places.Autocomplete(element[0], options);

            google.maps.event.addListener(scope.gPlace, 'place_changed', function() {
                var geoComponents = scope.gPlace.getPlace();
                console.log(geoComponents);
                var type = geoComponents.types[0];
                var url = geoComponents.url;
                var realName = geoComponents.name;
                var latitude = geoComponents.geometry.location.lat();
                var longitude = geoComponents.geometry.location.lng();
                var addressComponents = geoComponents.address_components;

                var smallAddress = geoComponents.address_components;

                smallAddress = smallAddress.filter(function(component){
                    switch (component.types[0]) {
                        case "street_number": // street number
                            return true;
                        case "route": // road name
                            return true;
                        case "neighborhood": // neighborhood
                            return true;
                        default:
                            return false;
                    }
                }).map(function(obj) {
                    return obj.short_name;
                });

                var textAddress = smallAddress[0] + ' ' + smallAddress[1];


                addressComponents = addressComponents.filter(function(component){
                    switch (component.types[0]) {
                        case "locality": // city
                            return true;
                        case "administrative_area_level_1": // state
                            return true;
                        case "country": // country
                            return true;
                        default:
                            return false;
                    }
                }).map(function(obj) {
                    return obj.long_name;
                });

                //addressComponents.push(latitude, longitude);

                scope.$apply(function() {
                    scope.details = type; // array containing each location component
                    scope.address = textAddress;
                    scope.city = addressComponents[0];
                    scope.state = addressComponents[1];
                    scope.url = url;
                    model.$setViewValue(element.val());
                });
            });
        }
    };
});


app.factory('lists', ['$http', function($http){
      var o = {
        lists: []
      };

    o.getAll = function() {
        return $http.get('/lists').success(function(data){
          angular.copy(data, o.lists);
        });
      };

    o.create = function(list) {
      return $http.post('/lists', list).success(function(data){
        o.lists.push(data);
      });
    };

    o.get = function(id) {
      return $http.get('/lists/' + id).then(function(res){
        return res.data;
      });
    };

    o.addPlace = function(id, place) {
	  return $http.post('/lists/' + id + '/places', place);
	};

    o.removePlace = function(id, place) {
	  return $http.delete('/lists/' + id + '/places/' + place);
	};

  return o;
}]);


app.config([
'$stateProvider',
'$urlRouterProvider',
function($stateProvider, $urlRouterProvider) {

  $stateProvider
    .state('home', {
      url: '/home',
      templateUrl: '/home.html',
      controller: 'MainCtrl',
      resolve: {
        listPromise: ['lists', function(lists){
          return lists.getAll();
        }]
      }
    })

    .state('lists', {
      url: '/lists/{id}',
      templateUrl: '/lists.html',
      controller: 'ListsCtrl',
      resolve: {
                list : ['$stateParams', 'lists',
                function($stateParams, lists) {
                    return lists.get($stateParams.id);
            }]
      }
    });

  $urlRouterProvider.otherwise('home');
}]);


app.controller('MainCtrl', [
'$scope',
'lists',
function($scope, lists){

  $scope.lists = lists.lists;

  $scope.addList = function(){

      if(!$scope.title || $scope.title === '') { return; }

      lists.create({
          title: $scope.title
      });

      $scope.title = '';
    };


  $scope.incrementUpvotes = function(list) {
      list.upvotes += 1;
    };



}]);


app.controller('ListsCtrl', [
'$scope',
'lists',
'list',
function($scope, lists, list){

    $scope.list = list;
    $scope.details;
    $scope.city;



    $scope.addPlace = function() {
      if ($scope.name === '') {
          return;
      }
      lists.addPlace(list._id, {
          name : $scope.name,
          type : $scope.details
      }).success(function(place){
          $scope.list.places.push(place);
      });

      $scope.name = '';
    };

    $scope.removePlace = function(place) {

      lists.removePlace(list._id, place._id)
          .success(function(argt){
            var pindex = list.places.indexOf(place);
            var rmd = list.places.splice(pindex, 1)[0]
            $scope.list.places = list.places;
      });

      $scope.name = '';
    };


}]);