var Student = require('./models/student.js');
var User = require('./models/user.js');
var Parent = require('./models/parent.js');
var chance = require('chance').Chance();

var AMOUNT = 50;

module.exports.add = addSet;

function addSet(num) {
  
  var users = [];
  var parents = [];
  var students = [];
  
  var addresses = [
    "36515 Hereford Street, Fremont, CA 94536",
    "3791 Dunbar Place, Fremont, CA 94536",
    "4279 Blue Ridge Street, Fremont, CA 94536",
    "3299 Lubbock Place, Fremont, CA 94536",
    "3476 Isherwood Place, Fremont, CA 94536"
  ];
  
  var models = [
    "2011 Toyota Camry, Red",
    "2017 Tesla Model S, Black",
    "2011 Mazda RX-8, Silver",
    "2015 Honda Accord, Silver",
    "2017 Lotus Evora, Orange",
    "2015 Ford F-150, Red",
    "2009 Chevrolet Camaro, Black",
    "2017 Alfa Romeo Giulia Quadrifoglio, Red",
    "2016 Dodge Dart, White",
    "2017 Lamborghini Aventador, Blue"
  ];
  
  for (var i = 0; i < num; i++) {
    // Add two students and a parent
    
    // Parent 1
    // Missing fields: carPhoto, photo, available, longitude, latitude
    var user1 = new User({
      username: "parent_one_" + toString(i + 1),
      password: "pepperoni",
      type: "Parent"
    });
    
    var parent1 = new Parent({
      userId: user1._id,
      name: chance.name({ gender: 'male' }),
      miles: chance.integer({ min: 0, max: 1000 }),
      carMakeModel: models[2 * i],
      phone: chance.phone(),
      licensePlate: genLicense(),
      email: chance.email(),
    });
    
    // Parent 2
    // Missing fields: carPhoto, photo, available, longitude, latitude
    var user2 = new User({
      username: "parent_two_" + toString(i + 1),
      password: "pepperoni",
      type: "Parent"
    });
    
    var parent2 = new Parent({
      userId: user2._id,
      name: chance.name({ gender: 'female' }),
      miles: chance.integer({ min: 0, max: 1000 }),
      carMakeModel: models[2 * i + 1],
      phone: chance.phone(),
      licensePlate: genLicense(),
      email: chance.email(),
    });
    
    // Student
    // Missing fields: photo, waitingForRide, latitude, longitude
    var user3 = new User({
      username: "student_" + toString(i + 1),
      password: "pepperoni",
      type: "Student"
    });
    
    var student = new Student({
      userId: user3._id,
      phone: chance.phone(),
      schoolName: "American High School",
      name: chance.name(),
      fatherId: parent1._id,
      motherId: parent2._id,
      address: addresses[i],
      email: chance.email(),
      miles: chance.integer({ min: 0, max: 1000 })
    });
    
    users += [user1, user2, user3];
    parents += [parent1, parent2];
    students += student;
  }
  
  // Actually add
  User.collection.insert(users);
  Parent.collection.insert(parents);
  Student.collection.insert(students); 
}

function genLicense() {
  var digit1 = chance.integer({ min: 1, max: 9 });
  var digit2 = chance.character({ casing: 'upper', alpha: true });
  var digit3 = chance.character({ casing: 'upper', alpha: true });
  var digit4 = chance.character({ casing: 'upper', alpha: true });
  var digit5 = chance.integer({ min: 1, max: 9 });
  var digit6 = chance.integer({ min: 1, max: 9 });
  var digit7 = chance.integer({ min: 1, max: 9 });
  return toString([digit1, digit2, digit3, digit4, digit5, digit6, digit7]);
}

function onInsert(err, docs) {
  if (err) {
    // TODO: Handle error
  } else {
    console.log("%d docs successfully stored", docs.length);
  }
}