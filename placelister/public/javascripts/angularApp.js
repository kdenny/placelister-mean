var app = angular.module('placelister', ['ui.router']);


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
    }).state('lists', {
      url: '/lists/{id}',
      templateUrl: '/lists.html',
      controller: 'ListsCtrl',
      resolve: {
                list : ['$stateParams', 'lists',
                function($stateParams, lists) {
                    return lists.get($stateParams.id);
            }]
      }
    }).state('login', {
      url: '/login',
      templateUrl: '/login.html',
      controller: 'AuthCtrl',
      onEnter: ['$state', 'auth', function($state, auth){
        if(auth.isLoggedIn()){
          $state.go('home');
        }
      }]
    }).state('register', {
      url: '/register',
      templateUrl: '/register.html',
      controller: 'AuthCtrl',
      onEnter: ['$state', 'auth',
      function($state, auth){
        if(auth.isLoggedIn()){
          $state.go('home');
        }
      }]
    });

  $urlRouterProvider.otherwise('home');
}]);


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
                    scope.lat = latitude;
                    scope.lon = longitude;
                    scope.url = url;
                    model.$setViewValue(element.val());
                });
            });
        }
    };
});


app.factory('lists', ['$http', 'auth', function($http, auth){
      var o = {
        lists: []
      };

    o.getAll = function() {
        return $http.get('/lists').success(function(data){
          angular.copy(data, o.lists);
        });
      };

    o.create = function(list) {
      return $http.post('/lists', list, {
          headers: {Authorization: 'Bearer '+auth.getToken()}
      }).success(function(data){
          console.log(data)
        o.lists.push(data);
      });
    };

    o.get = function(id) {
      return $http.get('/lists/' + id).then(function(res){
        console.log(res.data)
        return res.data;
      });
    };

    o.addPlace = function(id, place) {
	  return $http.post('/lists/' + id + '/places', place, {
          headers: {Authorization: 'Bearer '+auth.getToken()}
      });
	};

    o.removePlace = function(id, place) {
	  return $http.delete('/lists/' + id + '/places/' + place, {
          headers: {Authorization: 'Bearer '+auth.getToken()}
      });
	};

  return o;
}]);


app.factory('auth', ['$http', '$window', function($http, $window){
   var auth = {};

    auth.saveToken = function (token){
        $window.localStorage['placelister-token'] = token;
    };

    auth.getToken = function (){
        return $window.localStorage['placelister-token'];
    };

    auth.isLoggedIn = function(){
      var token = auth.getToken();

      if(token){
        var payload = JSON.parse($window.atob(token.split('.')[1]));

        return payload.exp > Date.now() / 1000;
      } else {
        return false;
      }
    };

    auth.currentUser = function(){
      if(auth.isLoggedIn()){
        var token = auth.getToken();
        var payload = JSON.parse($window.atob(token.split('.')[1]));
          console.log(payload.username)
        return payload.username;
      }
    };

    auth.register = function(user){
        console.log(user)
      return $http.post('/register', user).success(function(data){
        auth.saveToken(data.token);
      });
    };

    auth.logIn = function(user){
      return $http.post('/login', user).success(function(data){
        auth.saveToken(data.token);
      });
    };

    auth.logOut = function(){
      $window.localStorage.removeItem('placelister-token');
    };

  return auth;
}]);




app.controller('MainCtrl', [
'$scope',
'lists',
'auth',
function($scope, lists, auth){

  $scope.lists = lists.lists;

  $scope.isLoggedIn = auth.isLoggedIn;

  $scope.currentUser = auth.currentUser;

    console.log(typeof(auth.currentUser()));


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
'auth',
function($scope, lists, list, auth){

    $scope.list = list;
    $scope.details;
    $scope.city;
    $scope.lat;
    $scope.lon;

    $scope.isLoggedIn = auth.isLoggedIn;

    $scope.currentUser = auth.currentUser();




    $scope.addPlace = function() {
      if ($scope.name === '') {
          return;
      }
      lists.addPlace(list._id, {
          name : $scope.name,
          type : $scope.details,
          lat : $scope.lat,
          lon : $scope.lon
      }).success(function(place){
          $scope.list.places.push(place);
          console.log(place)
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


app.controller('AuthCtrl', [
'$scope',
'$state',
'auth',
function($scope, $state, auth){
  $scope.user = {};

  $scope.register = function(){
    auth.register($scope.user).error(function(error){
      $scope.error = error;
    }).then(function(){
      $state.go('home');
    });
  };

  $scope.logIn = function(){
    auth.logIn($scope.user).error(function(error){
      $scope.error = error;
    }).then(function(){
      $state.go('home');
    });
  };
}]);


app.controller('NavCtrl', [
'$scope',
'auth',
function($scope, auth){
  $scope.isLoggedIn = auth.isLoggedIn;
  $scope.currentUser = auth.currentUser;
  $scope.logOut = auth.logOut;
}]);