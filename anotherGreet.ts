interface LambdaEvent {
  body: string | null;
}

interface LambdaResponse {
  statusCode: number;
  body: string;
}

export const anotherGreet = async (event: LambdaEvent): Promise<LambdaResponse> => {
  try {
    // Parse the request body from JSON format to a Javascript object
    // This step is necessary because the body of an HTTP request is often sent as a
    // String in JSON Format,
    // and we need to convert it into an object to work with it easily in javascript.

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ msg: "Name is required" }),
      };
    }

    const body = JSON.parse(event.body);

    // Extract the 'name' field from the parsed body
    // we expect the client to send a name field in the body, and we
    // need to access that field to personalize the greeting message.

    const name: string | undefined = body.name;

    // if the 'name' field is missing, return a 400 Bad Request Response

    if (!name) {
      return {
        statusCode: 400, // Bad Request, indicating that the client missed a required field
        body: JSON.stringify({
          msg: "Name is required", // Specific message explaining the issue
        }),
      };
    }
    // if the 'name' is provided, return a successful response with a personalized message
    // since the name is available

    return {
      statusCode: 200, // Ok status, indicating the request was successful
      body: JSON.stringify({
        msg: `Hello, ${name}! welcome to our Application`, // success message personalized with the provided name
      }),
    };

  } catch (error) {
    // if any error occurred during the process (e.g) invalid Json format
    // or other unexpected errors

    return {
      statusCode: 500, // Internal Server Error, used when the server
      // encounters an issue while processing the request
      body: JSON.stringify({
        msg: "An error Occurred while processing your request",
      }),
    };
  }
};
