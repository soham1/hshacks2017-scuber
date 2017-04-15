setTimeout(checkStudentFound, 2000);

//Parent Id comes from ejs.     
function checkStudentFound() {
  $.ajax({
    url: "/studentFound/" + parentId
  }).done(function( data ) {
    if(data.found && data.totalKids > totalKids){
      window.location.href="/studentTripDetails/" + data.tripId;
    } else {
      console.log("Pinging");
      setTimeout(checkStudentFound, 2000);
    }
  });
}