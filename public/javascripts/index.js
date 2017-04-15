$('.button-collapse').sideNav({
  menuWidth: 300, // Default is 300
  edge: 'left', // Choose the horizontal origin
  closeOnClick: true, // Closes side-nav on <a> clicks, useful for Angular/Meteor
  draggable: true // Choose whether you can drag to open on touch screens
});

$('select').material_select();

$('.submitBtn').click(function() {
  navigator.geolocation.getCurrentPosition(function(position) {
    var latitude = position.coords.latitude;
    var longitude = position.coords.longitude;
    $("#currLong").val(longitude);
    $("#currLat").val(latitude);
    $("#findMeForm").submit();
  }, function(error) {
    console.log(error);
  });
});


