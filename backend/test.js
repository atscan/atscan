import { request } from "npm:undici";

const res = await request("https://jsonplaceholder.typicode.com/todos/1");
console.log(res.statusCode);
