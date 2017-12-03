import * as angular from 'angular'

// Register modules
import {WorkerWorkerService, StateWorkerService} from 'services/worker-service/worker-worker-service'
import {ProjectWorkerService} from 'services/project-service/project-worker-service'
import {FibraSparqlService} from 'services/fibra-sparql-service'
import {SparqlItemWorkerService} from 'services/sparql-item-service'
import {SparqlUpdateWorkerService} from 'services/sparql-update-service'
import {SparqlAutocompleteWorkerService} from 'services/sparql-autocomplete-service'
import 'services/sparql-statistics-service'
import 'services/worker-service/prototype-mapping-configuration'

import 'angular-http-auth'
import 'rdfstore'

let m: angular.IModule = angular.module('fibra', ['fi.seco.sparql', 'http-auth-interceptor', 'fibra.services.worker-service-prototype-mapping-configuration', 'fibra.services.sparql-statistics-service'])

m.config(($provide) => {
  $provide.service('fibraSparqlService', FibraSparqlService)
  $provide.service('projectWorkerService', ProjectWorkerService)
  $provide.service('stateWorkerService', StateWorkerService)
  $provide.service('workerWorkerService', WorkerWorkerService)
  $provide.service('sparqlItemWorkerService', SparqlItemWorkerService)
  $provide.service('sparqlUpdateWorkerService', SparqlUpdateWorkerService)
  $provide.service('sparqlAutocompleteWorkerService', SparqlAutocompleteWorkerService)
})
m.run(($rootScope: angular.IRootScopeService, workerWorkerService: WorkerWorkerService) => {
  $rootScope.$on('event:auth-loginRequired', () => workerWorkerService.$broadcast('event:auth-loginRequired'))
})

m.run(($rootScope: angular.IRootScopeService, authService: angular.httpAuth.IAuthService, $http: angular.IHttpService) => {
  $rootScope.$on('main:auth-loginAuthInfo', (event: angular.IAngularEvent, authorization: string) => {
    $http.defaults.headers!.common['Authorization'] = authorization
    authService.loginConfirmed()
  })
})
