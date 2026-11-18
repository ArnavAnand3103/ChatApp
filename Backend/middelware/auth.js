import jwt from 'jsonwebtoken';

// Resolve the same JWT secret as server.js (requireAuth):
// use JWT_SECRET from env, fall back to the dev secret outside production
const getJwtSecret = () =>
    process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? null : "SECRET_KEY");

export const verifyToken=(req,res,next)=>{

    const authHeader=req.headers.authorization;

    if(!authHeader){
        return res.status(401).json({message:"No token provided"});
    }
    const token=authHeader.split(" ")[1];

    const jwtSecret = getJwtSecret();
    if(!jwtSecret){
        return res.status(500).json({message:"JWT secret not set"});
    }

    try{

        const decoded=jwt.verify(token, jwtSecret);

        req.user=decoded;
        next();

    }catch(err){
        return res.status(401).json({message:"Invalid token"});
    }

};