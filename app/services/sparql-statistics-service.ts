'use strict'

import * as angular from 'angular'
import {WorkerService} from './worker-service/worker-service'
import {FibraSparqlService} from './fibra-sparql-service'
import {Project} from 'services/project-service/project'
import {RemoteEndpointConfiguration} from 'services/project-service/remote-endpoint-configuration'
import {TreeNode} from 'models/treenode'
import { IMap, FMap, EMap } from 'components/collection-utils';

export class PropertyStatistics {
  constructor(
    public subjects: number,
    public values: number,
    public min: number | string,
    public max: number | string
  ) {}
}

export class SparqlStatisticsService {

  public static getClassStatisticsQuery: string = `SELECT ?id ?instances {
# STARTGRAPH
  {
    SELECT ?id (COUNT(*) AS ?instances) {
      ?s a ?id .
      # CONSTRAINTS
    }
    GROUP BY ?id
  }
# ENDGRAPH
}`
  public static getPropertyStatisticsQuery: string = `SELECT ?classId ?propertyId ?subjects ?values ?min ?max {
  # STARTGRAPH
    {
      SELECT ?classId ?propertyId (COUNT(*) AS ?values) (COUNT(DISTINCT ?s) AS ?subjects) (MIN(?value) AS ?min) (MAX(?value) AS ?max) {
        ?s ?propertyId ?value .
        # CONSTRAINTS
        OPTIONAL {
          ?s a ?classId .
        }
      }
      GROUP BY ?classId ?propertyId
    }
  # ENDGRAPH
}`
  /* @ngInject */
  constructor(private workerService: WorkerService) {}
  public getClassStatistics(endpointConfiguration: Project | RemoteEndpointConfiguration, canceller?: angular.IPromise<any>): angular.IPromise<IMap<number>> {
    return this.workerService.call('sparqlStatisticsWorkerService', 'getClassStatistics', [endpointConfiguration.endpoint, endpointConfiguration.classStatisticsQuery], canceller)
  }
  public getPropertyStatistics(endpointConfiguration: Project | RemoteEndpointConfiguration, canceller?: angular.IPromise<any>): angular.IPromise<IMap<PropertyStatistics>> {
    return this.workerService.call('sparqlStatisticsWorkerService', 'getPropertyStatistics', [endpointConfiguration.endpoint, endpointConfiguration.propertyStatisticsQuery], canceller)
  }
}

export class SparqlStatisticsWorkerService {
  /* @ngInject */
  constructor(private fibraSparqlService: FibraSparqlService) {}
  public getClassStatistics(endpoint: string, query: string, canceller?: angular.IPromise<any>): angular.IPromise<IMap<number>> {
    return this.fibraSparqlService.query(endpoint, query, canceller).then(response => {
      let ret: IMap<number> = new FMap<number>()
      for (let b of response.results.bindings)
        ret.set(b['id'].value, b['instances'].value)
      return ret
    })
  }
  public getPropertyStatistics(endpoint: string, query: string, canceller?: angular.IPromise<any>): angular.IPromise<IMap<IMap<PropertyStatistics>>> {
    return this.fibraSparqlService.query(endpoint, query, canceller).then(response => {
      let ret: IMap<IMap<PropertyStatistics>> = new FMap<IMap<PropertyStatistics>>()
      for (let b of response.results.bindings)
        ret.goc(b['classId'] ? b['classId'].value : '', () => new FMap<PropertyStatistics>()).set(b['propertyId'].value, new PropertyStatistics(b['subjects'].value, b['values'].value, b['min'].value, b['max'].value))
      return ret
    })
  }
}

angular.module('fibra.services.sparql-statistics-service', [])
  .config(($provide) => {
    $provide.service('sparqlStatisticsService', SparqlStatisticsService)
    $provide.service('sparqlStatisticsWorkerService', SparqlStatisticsWorkerService)
  })
