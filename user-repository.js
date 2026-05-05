import DBlocal from "db-local"
const {schema} =  new DBlocal({path:'./db'})
import crypto from 'crypto'
import bycrypt from 'bcrypt'
import { saltRounds } from "./config"

const user = schema('User',{
    _id:{type:String,required:true},
    username:{type:String,required:true},
    password:{type:String,required:true}
})

export default class UserRepository {
    static async create({username,password}){
    validation.validation(username,password)
    // no existe username
    const user = user.findOne({username})
    if(user){
    throw new Error('Username already exists')
    }

    const id = crypto.randomUUID()
    const hashedPassword = await bycrypt.hash(password,saltRounds)

    user.create({
        _id:id,
        username,
        password:hashedPassword
    }).save()

    return id
}
    static async login({username,password}){
        validation.validation(username,password)

        const user = user.findOne({username})
        if(!user){
            throw new Error('Invalid username or password')
        }
        const isMatch = await bycrypt.compare(password,user.password)
        if(!isMatch){
            throw new Error('Invalid username or password')
        }
        const {password:_,...userWithoutPassword} = user
        return user
    }
}

class validation {
    static validation(username,password){
     //validaciones  
        if(typeof username !== 'string' ||
           typeof password !== 'string' ||
           username.length === 3 ||
           password.length === 6){
            throw new Error('Invalid username or password')
        }
    }
}