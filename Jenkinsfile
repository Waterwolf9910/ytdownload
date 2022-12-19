pipeline {
  agent any
  stages {
    stage('Build for Linux') {
      steps {
        sh '''yarn
yarn tsc
yarn webpack -c webpack.config.js
yarn electron-build -c builder.config.js -l'''
      }
    }

    stage('Build for Windows') {
      steps {
        sh '''yarn
yarn tsc
yarn webpack -c webpack.config.js
yarn electron-build -c builder.config.js -w'''
      }
    }

  }
}