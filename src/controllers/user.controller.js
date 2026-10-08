import asynchandler from "../utils/asynchandler.js"

const registerUser = asynchandler ( async (req, res) => {
    res.status(200).json({
        message: "hey this is register user route testing"
    })
})

export default registerUser