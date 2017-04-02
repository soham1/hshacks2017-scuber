var Student = require("../models/student");
var mapsClient = require("@google/maps").createClient({
  key: MAPS_KEY
});

// TODO: Get MAPS_KEY
var MAPS_KEY = "TODO";

module.exports = {
  atHome: atHome
};

// Returns a Boolean representing if the student
// is still at home or closer to the school
// True -> closer to home, False -> closer to school
// Does not use actual street distance since we only need to know which is closer
// Generally two points that are geographically closer (ignoring streets)
// are also actually closer
// Haversine formula used
function atHome(student) {
  var current = [student.latitude, student.longitude];
  var school  = coordsOfPlace(student.schoolName);
  var home    = coordsOfPlace(student.address);
  
}

// Haversine formula for calculating distance on a sphere
// Takes two arrays with lat and long each
function haversine(p1, p2) {
  
  var lat1 = p1[0];
  var lon1 = p1[1];
  var lat2 = p2[0];
  var lon2 = p2[1];
  
  // Radius of the earth in km
  var R = 6371;
  
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
    
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

// Using Places API
function coordsOfPlace(place) {
  
}