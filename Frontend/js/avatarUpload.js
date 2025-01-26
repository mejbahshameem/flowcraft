
      $("#img_upload").click(function(){

        $("#img_upload").hide(); 
        $("#loadingAvatar").show(); 


        var fd = new FormData();
        var file = $('#fileElem')[0].files[0];


        fd.append('avatar',file);

        var jsonAuth = getToken();
        var token = jsonAuth.token;

            const instance = axios.create({
                baseURL: getHostUrl(),
                timeout: 10000,
                headers: {'Authorization': 'Bearer '+token}
              });
              instance.post('/users/me/avatar', fd, {
              headers: {
                'Content-Type': 'multipart/form-data;',
              }
            })
              .then((response) => {
                //handle success

                $("#img_upload").show(); 
                $("#loadingAvatar").hide(); 
                document.getElementById("avatarimage").src=response.data;


              }).catch((error) => {
                //handle error
              });


    });






    function getBase64(file) {
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = function () {
        document.getElementById("avatarimage").src = reader.result; 
      };
      reader.onerror = function (error) {
        console.log('Error: ', error);
      };
   }

//listens to a file upload and shows upload button
const input = document.getElementById('fileElem');
input.addEventListener('change', updateValue);
function updateValue(e) {
    $("#img_upload").show();
    var fd = new FormData();
    var file = $('#fileElem')[0].files[0];

    getBase64(file); 
  }
