Date.prototype.add_millis = function(n) {
    this.setMilliseconds(this.getMilliseconds()+n);
    return this;
};
function container_exists(){
    var time_remaining = two_hours - time_elapsed;
    var countUntil = now.add_millis(time_remaining);
    $('#defaultCountdown').countdown({until: countUntil});
    window.open('/temporary-24hr-algopiper?algopiper=' + JSON.parse(localStorage.getItem('algopiper-container'))['endpoint']);
    $('#deploy-btn').removeAttr('disabled');
    $('#deploy-btn').html('Launch Now!');
    $('#loading-img').hide();
}
function container_request(){
    var jqxhr = $.get( "/try-algopiper")
	       .done(function(data,textStatus,jqXHR) {
               data = JSON.parse(data);
               if(data['status'] === 'success'){
                   function openTab(){
                       window.open('/temporary-24hr-algopiper?algopiper=' + data['endpoint']);
                   }
                   setTimeout(openTab, 2000);
                   localStorage.setItem('algopiper-container', JSON.stringify({'start_time': new Date, 'endpoint': data['endpoint']}));
                   var now = new Date();
                   var two_hours = 24 * 60 * 60 * 1000;
                   var countUntil = now.add_millis(two_hours);
                   $('#defaultCountdown').countdown({until: countUntil});
               }
           })
        .fail(function(data) {
            alert(data);
        })
        .always(function(){
            $('#deploy-btn').removeAttr('disabled');
            $('#deploy-btn').html('Launch Now!');
        });
}

if(localStorage.getItem('algopiper-container') != undefined){
    var now = new Date();
    var time_elapsed = now - new Date(JSON.parse(localStorage.getItem('algopiper-container'))['start_time']);
    var two_hours = 24 * 60 * 60 * 1000;
    if(time_elapsed < two_hours){
        container_exists();
    } else {
        container_request();
    }
} else {
    container_request();
}

$('#deploy-btn').click(function(){
   container_exists(); 
});