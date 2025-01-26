window.onload = init;
function init() { 
    var path = window.location.pathname;
    file = path.substr(path.lastIndexOf("/")+1, path.length-1);
    if(file == "member.html"){
        
        var jsonAuth = JSON.parse(localStorage.getItem('jsonAuth'));
        if(!jsonAuth || jsonAuth === null){
            //check if we have a currently set a name/token, if not => send to index
         window.location.href = "./index.html";
        }
        else{
            //check authorization of this user
            getAuthorization();
            //get users name and profile pic
        document.getElementById('myname').innerHTML = jsonAuth.name;
        document.getElementById('myPic').src = "https://eu.ui-avatars.com/api/?background=0D8ABC&color=fff&size=128&name="+jsonAuth.name;
        }

        

        showFollowedWorkflows();

    }
}




function getHostUrl(){ 
  var hostUrl = "http://localhost:3000";
  return hostUrl;
}


function getToken(){ 
  var jsonAuth = JSON.parse(localStorage.getItem('jsonAuth'));
      return jsonAuth;
}



function isEmailCorrect(input){
  var regexEmail = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  if(!regexEmail.test(input)){
      return false;
      }
      return true;

  }



function isEmpty(input){
  if(input.length < 1){
      return true;
  }
  else if(input.trim().length < 1){
      return true;
  }
  return false;
}



function getAuthorization() {

  var jsonAuth = getToken();
  if(jsonAuth === null){
    window.location.href = "./index.html";
    return;
  }
  var token = jsonAuth.token;


  var hostUrl = getHostUrl();

  const instance = axios.create({
      baseURL: hostUrl,
    });

    instance.get('/user/'+token)
    .then(function (response) { 
        

      if(response.data.avatar !== null){
          document.getElementById("myPic").src=response.data.avatar;
          document.getElementById("avatarimage").src=response.data.avatar;
      }
      else{
        var jsonAuth = JSON.parse(localStorage.getItem('jsonAuth'));
        document.getElementById("avatarimage").src="https://eu.ui-avatars.com/api/?background=0D8ABC&color=fff&size=128&name="+jsonAuth.name;
      }
      //response.data.account_status = ACTIVATED  ||  response.data.avatar = null || response.data.name

     // alert(response.data.name);
     console.log("successfully authorized");

    }).catch(function (err) {  window.location.href = "./index.html"; });


}





function logoutSubmit(){
var jsonAuth = JSON.parse(localStorage.getItem('jsonAuth'));
if (!jsonAuth) {
    window.location.href = "./index.html";
    return;
}
else{
    var username = jsonAuth.name;
    var token = jsonAuth.token;
}

var hostUrl = getHostUrl();

const instance = axios.create({
baseURL: hostUrl,
timeout: 1000,
headers: {'Authorization': 'Bearer '+token}
});

instance.post('/users/logout')
.then(function (response) { 
localStorage.clear();
window.location.href = "./index.html";
}).catch(err => console.log(err));

}

function deactivateAccount(){
 window.location.href = "./deactivationTrigger.html";
}



module.exports.isEmpty = isEmpty;
module.exports.isEmailCorrect = isEmailCorrect;
module.exports.getToken = getToken;