var app = angular.module('placelister', ['ui.router', 'leaflet-directive', 'ngAnimate', 'ui.bootstrap']);


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
    }).state('dashboard', {
      url: '/dashboard',
      templateUrl: '/dashboard.html',
      controller: 'DashboardCtrl',
      resolve: {
                list : ['lists',
                function(lists) {
                    return lists.getUserLists();
            }]
      }
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
                    scope.details = {};
                    scope.details.type = type;
                    scope.details.address = textAddress;
                    scope.city = addressComponents[0];
                    scope.state = addressComponents[1];
                    scope.lat = latitude;
                    scope.lon = longitude;
                    scope.url = url;
                    scope.realName = realName;
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

    o.getUserLists = function() {
        return $http.get('/dashboard/', {
                headers: {Authorization: 'Bearer '+auth.getToken()}
            }).then(function(res){
            return res.data;
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
'leafletData',
function($scope, lists, list, auth, leafletData){

    $scope.list = list;
    $scope.details;
    $scope.city;
    $scope.type;
    $scope.address;
    $scope.lat;
    $scope.lon;

    $scope.oneAtATime = true;

    $scope.isLoggedIn = auth.isLoggedIn;

    $scope.currentUser = auth.currentUser();

    angular.extend($scope, {
        osloCenter: {
            //autoDiscover: true,
            zoom : 12
        },
        data: {markers: {}},
        layers: {
                    baselayers: {
                        xyz: {
                            name: 'Mapnik',
                            url: 'http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png',
                            type: 'xyz'
                        }
                    }
                }
    });


    $scope.makePoints = function() {
        console.log("Making points")
        $scope.points = {};
        $scope.data.markers = {};
        $scope.centerLat;
        $scope.centerLng;
        var bounds = [];
        for (i = 0; i < $scope.list.places.length; i++) {
            thisp = $scope.list.places[i];
            apoint = {
                    lat: thisp.lat,
                    lng: thisp.lon,
                    id: thisp._id,
                    message: thisp.realName + "<br>" + thisp.address,
                    //focus: true
                };
            var count = i;
            $scope.points[count] = apoint;
            bounds.push([apoint.lat, apoint.lng]);

            if (i == $scope.list.places.length - 1) {
                leafletData.getMap("map").then(function(map) {
                    console.log("Here")
                    map.fitBounds(bounds, { padding: [20, 20] });
                });
                leafletData.getMap("map").then(function(map) {
                    var bounds = map.getBounds(bounds);
                    console.log(Object.keys(bounds._southWest));
                    $scope.centerLat = (bounds._northEast.lat + bounds._southWest.lat) / 2;
                    $scope.centerLng = (bounds._northEast.lng + bounds._southWest.lng) / 2;

                    console.log($scope.centerLat);
                });
            }

            }

        angular.extend($scope.data, {

            markers : $scope.points,
            osloCenter : {
                lat : $scope.centerLat,
                lng : $scope.centerLng
            }

        });
    };

    $scope.makePoints();


    $scope.addPlace = function() {
      if ($scope.name === '') {
          return;
      }
      lists.addPlace(list._id, {
          name : $scope.name,
          realName : $scope.realName,
          type : $scope.details.type,
          url : $scope.url,
          address : $scope.details.address,
          city : $scope.city,
          //list_type : $scope.list_type,
          lat : $scope.lat,
          lon : $scope.lon
          //focus: true
      }).success(function(place){
          console.log(place)
          $scope.list.places.push(place);
          console.log($scope.list.places)
          $scope.makePoints();
      });

      $scope.name = '';

    };

    $scope.removePlace = function(place) {


      lists.removePlace(list._id, place._id)
          .success(function(argt){
            //  console.log(argt)
            //console.log($scope.list.places)
            $scope.list.places.splice(argt, 1)

            $scope.makePoints();
      });

      $scope.name = '';

    };

    $scope.highlightMarker = function(place) {
        var pid = place._id;
        var marks = {};
        marks = $scope.data.markers;

        for (i = 0; i < Object.keys(marks).length; i++) {
            if (marks[i].id == pid) {
                marks[i].focus = true;
            }
            else {
                marks[i].focus = false;
            };
        };

        angular.extend($scope.data, {

            markers : marks,
            osloCenter : {
                lat : place.lat,
                lng : place.lng
            }

        });

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


app.controller('DashboardCtrl', [
'$scope',
'lists',
'list',
'auth',
function($scope, lists, list, auth){


  $scope.theselists = list;

  console.log($scope.theselists)

  $scope.isLoggedIn = auth.isLoggedIn;


  $scope.currentUser = auth.currentUser;



  $scope.addList = function(){

      if(!$scope.title || $scope.title === '') { return; }
      lists.create({
          title: $scope.title
      }).success(function(list){
          $scope.theselists.push(list);
      });




      $scope.title = '';
    };

}]);
