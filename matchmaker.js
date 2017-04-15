var mongoose = require('mongoose');
var Parent = require("./models/parent.js");
var Student = require("./models/student.js");
var Trip = require("./models/trip.js");
var TripRoute = require("./models/tripRoute.js");
var matchmaker = {};
var studentQueue = [];
var parentQueue = [];

matchmaker.requestRide = function(data) {
  var student = data.student;
  console.log("LOOKING FOR A RIDE BY STUDENT");
  if (parentQueue.length == 0) {
    console.log("ADDING STUDENT TO THE QUEUE");
    studentQueue.push(student);
  }
  else {
    console.log("MATCHING");
    var studentMotherId = student.motherId;
    var studentFatherId = student.fatherId;
    var parentIds = parentQueue.map(function(parent) {
      return parent._id;
    });
    console.log("FOUND ParentIds", parentIds);
    Parent.find({
      '_id': {
        $in: parentIds
      }
    }, function(err, parentArray) {
      console.log("FOUND PARENT ARRAY", parentArray);
      if (err) {
        console.log("ERROR", err);
      }

      //FIND IF A PARENT OF STUDENT IS IN THE QUEUE
      //IF PARENT, THEN TAKE THAT
      //ELSE TAKE LAST ONE
      var parentFound = false;
      
      for (var i = 0; i < parentArray.length; i++) {
        var parent = parentArray[i];
        if (parent._id == studentFatherId || parent._id == studentMotherId) {
          createOrMatchTrip(parentArray, i, student);
          parentFound = true;
          break;
        }
      }
  
      if(!parentFound) {
        createOrMatchTrip(parentArray, parentArray.length - 1, student);
      }

  });
  }
};

matchmaker.findStudent = function(data) {
  var parent = data.parent;
  console.log("LOOKING FOR STUDENTS BY PARENT", parent);
  if (studentQueue.length == 0) {
    console.log("ADDING PARENT TO THE QUEUE id=", parent._id);
    parentQueue.push(parent);
  }
  else {
    console.log("MATCHING");
    var studentFound = false;
    for(var i = 0; i < studentQueue.length; i++) {
      if (parent._id == studentQueue[i].motherId || parent._id == studentQueue[i].fatherId) {
        createOrMatchTripP(studentQueue, i, parent);
        studentFound = true;
        break;
      }  
    }

    if (!studentFound) {
      createOrMatchTripP(studentQueue, studentQueue.length - 1, parent);
    }
  }
};

function addTripRoute(trip, student, parent) {
  var latitude;
  var longitude;

  if (student.destination == 'Home') {
    longitude = student.homeLong;
    latitude = student.homeLat;
  }
  else {
    longitude = student.schoolLong;
    latitude = student.schoolLat;
  }

  TripRoute.find({
    tripId: trip._id
  }, function(err, tripRoutes) {
    if (err) {
      console.log("ERROR", err);
    }
    else {
      if (tripRoutes.length < parent.seatsAvailable) {
        console.log("CREATING TRIP ROUTE");
        var tripRoute = new TripRoute({
          tripId: trip._id,
          studentId: student._id,
          stopOrder: tripRoutes.length + 1,
          destination: student.destination,
          latitude: latitude,
          longitude: longitude,
          isDone: false
        });

        tripRoute.save(function(err) {
          if (err) {
            console.log("ERROR", err);
          }
          else {
            
          }
        });
      }
      else {
        //Parent's car is full. 
        console.log("PARENT CAR IS FULL");
        for(var i = 0; i < parentQueue.length; i++) {
          if (parentQueue[i]._id == parent._id){
            parentQueue.splice(i, 1);
            console.log("PARENT index REMOVED", i);
            break;
          }
        }
      }
    }
  });

}

function createOrMatchTripP(studentArray, i, parent) {
  var student = studentArray[i];
  Trip.findOne({
    parentId: parent._id,
    isDone: false
  }, function(err, trip) {
    if (err) {
      return console.log("ERROR", err);
    }
    else {
      if (!trip) {
        var newTrip = new Trip({
          tripDate: new Date(),
          parentId: parent._id,
          isDone: false
        });

        newTrip.save(function(err) {
          if (err) {
            console.log("ERROR");
          }
          else {
            addTripRoute(newTrip, student, parent);
          }
        });
      }
      else {
        //TRIP ALREADY EXISTS
        addTripRoute(trip, student, parent);
      }
    }
  });
  
}

function createOrMatchTrip(parentArray, i, student) {
  var parent = parentArray[i];
  Trip.findOne({
    parentId: parent._id,
    isDone: false
  }, function(err, trip) {
    if (err) {
      return console.log("ERROR", err);
    }
    else {
      if (!trip) {
        var newTrip = new Trip({
          tripDate: new Date(),
          parentId: parent._id,
          isDone: false
        });

        newTrip.save(function(err) {
          if (err) {
            console.log("ERROR");
          }
          else {
            addTripRoute(newTrip, student, parent);
          }
        });
      }
      else {
        //TRIP ALREADY EXISTS
        addTripRoute(trip, student, parent);
      }
    }
  });
}

module.exports = matchmaker;
