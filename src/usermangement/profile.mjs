export const getUserProfile =  async (event) => {
    return {
      statusCode: 200,
      body: JSON.stringify({result:"Hello" }),
    };
}