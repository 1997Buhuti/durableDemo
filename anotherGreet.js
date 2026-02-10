exports.anotherGreet = async (event)=>{
    try {
      //Parse the request body from JSON format to a Javascript object
      //This step is necessary because the body of an HTTP request is oftent send as a
      //String in JSON Format,
      //and we need to convert it into an object to work with it easily in javascrip.
      
      const body = JSON.parse(event.body);

      //Extract the 'name' field from the paresed body
      //we expect the client to send a name field in the  body, and we
      //need to access that field to personalze the greeting message.

      const name = body.name;

      //if the 'name'field is missing , return a 400 Bad Request Response

      if(!name){
        return {
            statusCode:400,//Bad Request , indicating that the client missed a required field
            body:JSON.stringify({
                msg:"Name is required",//Specific message explaining the issue
            }),
        }
      };
     //if the 'name' is provied ,return a succesful response with a personalized message
     //since the ame is available

     return {
        statusCode:200,//Ok status, indicating the request was succesfull
        body:JSON.stringify({
           msg: `Hello, ${name}! welcome to our Application` ,//success messag personalized with the provied name

        }),
     };

    } catch (error) {
        // if any error occured during the process (e.g) invalid JSon format
        //or other unexpeced errors

       return {
        statusCode:500,//Internal Server Error, used when the server
        //encounters an issue while processing  the request
        body: JSON.stringify({
            msg:"An error Occurred while  processing your request"
        }),
       } ;
    }
}