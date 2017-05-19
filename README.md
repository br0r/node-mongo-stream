# nmongo

Stream data directly from mongo instead of waiting for buffering.   
Only output for now. And all output is JSON formatted.   

## Installation
```
  npm install -g node-mongo-stream
```

## Usage
```bash
  nmongo host:port/db 'db.test.find().limit(10)' > data
```
