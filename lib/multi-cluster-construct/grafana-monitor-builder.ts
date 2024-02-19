import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as amp from 'aws-cdk-lib/aws-aps';
import { GrafanaOperatorSecretAddon } from './grafana-operator-secret-addon';

export default class GrafanaMonitoringConstruct {

    build(scope: Construct, id: string, contextAccount?: string, contextRegion?: string ) {

        const stackId = `${id}-grafana-monitor`;

        const account = contextAccount! || process.env.COA_ACCOUNT_ID! || process.env.CDK_DEFAULT_ACCOUNT!;
        const region = contextRegion! || process.env.COA_AWS_REGION! || process.env.CDK_DEFAULT_REGION!;

        this.create(scope, account, region)
            .build(scope, stackId);
    }

    create(scope: Construct, contextAccount?: string, contextRegion?: string ) {

        const account = contextAccount! || process.env.COA_ACCOUNT_ID! || process.env.CDK_DEFAULT_ACCOUNT!;
        const region = contextRegion! || process.env.COA_AWS_REGION! || process.env.CDK_DEFAULT_REGION!;

        const ampWorkspaceName = "multi-cluster-monitoring";
        const ampPrometheusEndpoint = (blueprints.getNamedResource(ampWorkspaceName) as unknown as amp.CfnWorkspace).attrPrometheusEndpoint;
        const amgEndpointUrl = process.env.AMG_ENDPOINT_URL;

        Reflect.defineMetadata("ordered", true, blueprints.addons.GrafanaOperatorAddon); //sets metadata ordered to true for GrafanaOperatorAddon

        const fluxRepository: blueprints.FluxGitRepo = blueprints.utils.valueFromContext(scope, "fluxRepository", undefined);
        fluxRepository.values!.AMG_AWS_REGION = region;
        fluxRepository.values!.AMP_ENDPOINT_URL = ampPrometheusEndpoint;
        fluxRepository.values!.AMG_ENDPOINT_URL = amgEndpointUrl;

        const addOns: Array<blueprints.ClusterAddOn> = [
            new blueprints.addons.ExternalsSecretsAddOn(),
            new blueprints.addons.GrafanaOperatorAddon({
                createNamespace: true,
            }),
            new blueprints.addons.FluxCDAddOn({"repositories": [fluxRepository]}),
            new GrafanaOperatorSecretAddon(),
        ];

        return blueprints.ObservabilityBuilder.builder()
            .account(account)
            .region(region)
            .version('auto')
            .resourceProvider(ampWorkspaceName, new blueprints.CreateAmpProvider(ampWorkspaceName, ampWorkspaceName))
            .addOns(
                ...addOns
            );
    }
}