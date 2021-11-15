## Diamond Tiles POS Backend
###### Developed and Maintained by [Hassan Naveed](http://github.com/hassannaveed24) and [Muneeb Naveed](http://github.com/muneeebnaveeed)
Backend application for serving data from MongoDB database to React frontend (built in NodeJS)
#### Initializing
- Install project dependencies. To install the project dependencies:
`$ npm install`

- Add two environment files named `.development.env` and `.production.env` and add the following block of code to run the project as intended:

```ruby
DB_CONNECTION_STRING=mongodb://127.0.0.1:27017
PORT=5100
JWT_SECRET=secret
JWT_EXPIRES_IN=30d
```

- Run the application in development mode using:
`$ npm run dev`

- Run the application using:
`$ npm start`
