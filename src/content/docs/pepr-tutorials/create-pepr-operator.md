---
title: Use the WebAppController Module
description: Use the WebAppController Module
---

sed -i '' -e '/new PeprModule(cfg, \[/,/\]);/c\
new PeprModule(cfg, [WebAppController]);' ./pepr.ts

# Update Imports
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' 's|import { HelloPepr } from "./capabilities/hello-pepr";|import { WebAppController } from "./capabilities";|' ./pepr.ts
else
  sed -i 's|import { HelloPepr } from "./capabilities/hello-pepr";|import { WebAppController } from "./capabilities";|' ./pepr.ts
fi
```
<!-- End Block -->

Commit your changes now that the WebAppController is part of the Pepr Module:

```bash
git add pepr.ts && git commit -m "Register WebAppController with pepr module"
```

## Build and Deploy Your Operator

**[🟢🟢🟢🟢🟢⚪] Step 5 of 6**

### Preparing Your Environment

Create an ephemeral cluster with `k3d`.

```bash
k3d cluster delete pepr-dev &&
k3d cluster create pepr-dev --k3s-arg '--debug@server:0' --wait &&
kubectl rollout status deployment -n kube-system
```

**What is an ephemeral cluster?**  
An ephemeral cluster is a temporary Kubernetes cluster that exists only for testing purposes. Tools like Kind (Kubernetes in Docker) and k3d let you quickly create and destroy clusters without affecting your production environments.

### Update and Prepare Pepr

Make sure Pepr is updated to the latest version:

```bash
npx pepr update --skip-template-update
```

> ⚠️ **Important Note**: Be cautious when updating Pepr in an existing project as it could potentially override custom configurations. The `--skip-template-update` flag helps prevent this.

### Building the Operator

Build the Pepr module by running:

<!-- Start Block -->
```bash
npx pepr format && 
npx pepr build
```
<!-- End Block -->

Commit your changes after the build completes:

```bash
git add capabilities/ package*.json && git commit -m "Build pepr module"
```

**The build process explained**  

The `pepr build` command performs three critical steps:

1. **Compile TypeScript**: Converts your TypeScript code to JavaScript using the settings in tsconfig.json
2. **Bundle the Operator**: Packages everything into a deployable format using esbuild
3. **Generate Kubernetes Manifests**: Creates all necessary YAML files in the `dist` directory, including:
   - Custom Resource Definitions (CRDs)
   - The controller deployment
   - ServiceAccounts and RBAC permissions
   - Any other resources needed for your operator

This process creates a self-contained deployment unit that includes everything needed to run your operator in a Kubernetes cluster.

```text
┌─────────────────────┐          ┌──────────────────┐          ┌───────────────────┐
│                     │          │                  │          │                   │
│  Your Pepr Code     │────────▶ │  pepr build      │────────▶ │ dist/             │
│  (TypeScript)       │          │  (Build Process) │          │(Deployment Files) │
│                     │          │                  │          │                   │
└─────────────────────┘          └──────────────────┘          └───────────────────┘
                                                                        │
                                                                        │
                                                                        ▼
                                                               ┌───────────────────┐
                                                               │                   │
                                                               │  Kubernetes       │
                                                               │  Cluster          │
                                                               │                   │
                                                               └───────────────────┘
```

### Deploy to Kubernetes

To deploy your operator to a Kubernetes cluster:

<!-- Start Block -->
```bash
kubectl apply -f dist/pepr-module-my-operator-uuid.yaml;
# Wait for pods to have a status so we can check for readiness
sleep 10; 
kubectl wait --for=condition=Ready pods -l app -n pepr-system --timeout=120s
```
<!-- End Block -->

**What's happening during deployment?**  

1. The first command applies all the Kubernetes resources defined in the YAML file, including:
   - The WebApp CRD (Custom Resource Definition)
   - A Deployment that runs your operator code
   - The necessary RBAC permissions for your operator to function

2. The second command waits for the operator pod to be ready before proceeding. This ensures your operator is running before you attempt to create WebApp resources.

#### Troubleshooting Deployment Issues

**Troubleshooting operator startup problems**  

If your operator doesn't start properly, check these common issues:

1. **Check pod logs**:
  
   ```bash
   kubectl logs -n pepr-system -l app --tail=100
   ```

2. **Verify permissions**:

   ```bash
   kubectl describe deployment -n pepr-system
   ```

   Look for permission-related errors in the events section.

Verify the deployment was successful by checking if the CRD has been properly registered:

<!-- Start Block -->
```bash
# Wait for crd to be registered
sleep 10;
kubectl get crd | grep webapp
```
<!-- End Block -->

You should see `webapps.pepr.io` in the output, which confirms your Custom Resource Definition was created successfully.

#### Understanding the WebApp Resource

You can use `kubectl explain` to see the structure of your custom resource.
It may take a moment for the cluster to recognize this resource before the following command will work:

<!-- Start Block -->
```bash
# This command takes a lot of time to succeed the first time after CRD creation
until kubectl explain wa.spec >/dev/null 2>&1; do
  sleep 2;
done

kubectl explain wa.spec
```
<!-- End Block -->

Expected Output:

```text
GROUP:      pepr.io
KIND:       WebApp
VERSION:    v1alpha1

FIELD: spec <Object>

DESCRIPTION:
    <empty>
FIELDS:
  language      <string> -required-
    Language defines the language of the web application, either English (en) or
    Spanish (es).

  replicas      <integer> -required-
    Replicas is the number of desired replicas.

  theme <string> -required-
    Theme defines the theme of the web application, either dark or light.
```

> 💡 **Note**: `wa` is the short form of `webapp` that kubectl recognizes. This resource structure directly matches the TypeScript interface we defined earlier in our code.

[Back to top](#building-a-kubernetes-operator-with-pepr)

## Test Your Operator

**[🟢🟢🟢🟢🟢🟢] Step 6 of 6**

**Understanding reconciliation**  

Reconciliation is the core concept behind Kubernetes operators. It's the process of:

1. Observing the current state of resources in the cluster
2. Comparing it to the desired state (defined in your custom resource)
3. Taking actions to align the actual state with the desired state

This continuous loop ensures your application maintains its expected configuration even when disruptions occur.

```text
┌───────────────────┐
│                   │
│  Custom Resource  │◄────────────┐
│  (WebApp)         │             │
│                   │             │
└───────┬───────────┘             │
        │                         │
        │ Observe                 │
        ▼                         │
┌───────────────────┐    ┌────────────────┐
│                   │    │                │
│  Pepr Operator    │───►│  Reconcile     │
│  Controller       │    │  (Take Action) │
│                   │    │                │
└───────┬───────────┘    └────────────────┘
        │                         ▲
        │ Create/Update           │
        ▼                         │
┌───────────────────┐             │
│  Owned Resources  │─────────────┘
│  • ConfigMap      │ If deleted or
│  • Service        │ changed, trigger
│  • Deployment     │ reconciliation
└───────────────────┘
```

### Creating a WebApp Instance

Let's create an instance of our custom `WebApp` resource in English with a light theme and 1 replicas:

<!-- Start Block -->
```bash
curl -s https://raw.githubusercontent.com/defenseunicorns/pepr-excellent-examples/main/pepr-operator/webapp-light-en.yaml \
  -o webapp-light-en.yaml
```
<!-- End Block -->

Examine the contents of `webapp-light-en.yaml`. It defines a WebApp with English language, light theme, and 1 replica.

Next, apply it to the cluster:

<!-- Start Block -->
```bash
kubectl create namespace webapps &&
kubectl apply -f webapp-light-en.yaml
```
<!-- End Block -->

**How resource creation works**  

1. Kubernetes API server receives the WebApp resource
2. Our operator's controller (in `index.ts`) detects the new resource via its reconcile function
3. The controller validates the WebApp using our validator
4. The reconcile function creates three "owned" resources:
   - A ConfigMap with HTML content based on the theme and language
   - A Service to expose the web application
   - A Deployment to run the web server pods with the specified number of replicas
5. The status is updated to track progress

All this logic is in the code we wrote earlier in the tutorial.

### Verifying Resource Creation

Now, verify that the WebApp and its owned resources were created properly:

<!-- Start Block -->
```bash
kubectl get cm,svc,deploy,webapp -n webapps
```
<!-- End Block -->

Expected Output:

```bash
NAME                                    DATA   AGE
configmap/kube-root-ca.crt              1      6s
configmap/web-content-webapp-light-en   1      5s

NAME                      TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
service/webapp-light-en   ClusterIP   10.43.85.1   <none>        80/TCP    5s

NAME                              READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/webapp-light-en   1/1     1            1           5s
```

> 💡 **Tip**: Our operator created three resources based on our single WebApp definition - this is the power of operators in action!

### Checking WebApp Status

The status field is how our operator communicates the current state of the WebApp:

<!-- Start Block -->
```bash
kubectl get wa webapp-light-en -n webapps -ojsonpath="{.status}" | jq
```
<!-- End Block -->

Expected Output:

```json
{
  "observedGeneration": 1,
  "phase": "Ready"
}
```

**Understanding status fields**  

- **observedGeneration**: A counter that increments each time the resource spec is changed
- **phase**: The current lifecycle state of the WebApp ("Pending" during creation, "Ready" when all components are operational)

This status information comes from our reconciler code, which updates these fields during each reconciliation cycle.

You can also see events related to your WebApp that provide a timeline of actions taken by the operator:

<!-- Start Block -->
```bash
kubectl describe wa webapp-light-en -n webapps
```
<!-- End Block -->

Expected Output:

```text
Name:         webapp-light-en
Namespace:    webapps
API Version:  pepr.io/v1alpha1
Kind:         WebApp
Metadata: ...
Spec:
  Language:  en
  Replicas:  1
  Theme:     light
Status:
  Observed Generation:  1
  Phase:                Ready
Events:
  Type    Reason                    Age   From             Message
  ----    ------                    ----  ----             -------
  Normal  InstanceCreatedOrUpdated  36s   webapp-light-en  Pending
  Normal  InstanceCreatedOrUpdated  36s   webapp-light-en  Ready
```

### Viewing Your WebApp

To access your WebApp in a browser, use port-forwarding to connect to the service.
The following command runs the portforward in the background.
Be sure to make note of the `Port-forward PID` for later when we tear down the test environment.

```bash
kubectl port-forward svc/webapp-light-en -n webapps 3000:80 &
PID=$!
echo "Port-forward PID: $PID"
```

**About port-forwarding**  

Port-forwarding creates a secure tunnel from your local machine to a pod or service in your Kubernetes cluster. In this case, we're forwarding your local port 3000 to port 80 of the WebApp service, allowing you to access the application at <http://localhost:3000> in your browser.

Now open [http://localhost:3000](http://localhost:3000) in your browser or run `curl http://localhost:3000` to see the response in a terminal.
The browser should display a light theme web application:

![WebApp Light Theme](/assets/light.png)

### Testing the Reconciliation Loop

A key feature of operators is their ability to automatically repair resources when they're deleted or changed. Let's test this by deleting the ConfigMap:

<!-- Start Block -->
```bash
kubectl delete cm -n webapps --all &&
sleep 10 && 
kubectl get cm -n webapps 
```
<!-- End Block -->

Expected output:

```text
configmap "kube-root-ca.crt" deleted
configmap "web-content-webapp-light-en" deleted
NAME                          DATA   AGE
kube-root-ca.crt              1      0s
web-content-webapp-light-en   1      0s
```

Now that we've successfully deployed a WebApp, commit your changes:

```bash
git add webapp-light-en.yaml && git commit -m "Add WebApp resource for light mode in english"
```

**Behind the scenes of reconciliation**  

1. When you deleted the ConfigMap, Kubernetes sent a DELETE event
2. Our operator (in `index.ts`) was watching for these events via the `onDeleteOwnedResource` handler
3. This triggered the reconciliation loop, which detected that the ConfigMap was missing
4. The reconciler recreated the ConfigMap based on the WebApp definition
5. This all happened automatically without manual intervention - the core benefit of using an operator!

> 🛠️ **Try it yourself**: Try deleting the Service or Deployment. What happens? The operator should recreate those too!

### Updating the WebApp

Now let's test changing the WebApp's specification.
Copy down the next WebApp resource with the following command:

<!-- Start Block -->
```bash
curl -s https://raw.githubusercontent.com/defenseunicorns/pepr-excellent-examples/main/pepr-operator/webapp-dark-es.yaml \
  -o webapp-dark-es.yaml
```
<!-- End Block -->

Compare the contents of `webapp-light-en.yaml` and `webapp-dark-es.yaml` with the command:

```bash
diff --side-by-side \
  webapp-light-en.yaml \
  webapp-dark-es.yaml
```

<!-- Start Block -->
```bash
kubectl apply -f webapp-dark-es.yaml 
```
<!-- End Block -->

> 💡 **Note**: We've changed the theme from light to dark and the language from English (en) to Spanish (es).

Your port-forward should still be active, so you can refresh your browser to see the changes.
If your porf-forward is no longer active for some reason, create a new one:

```bash
# Only needed if previous port-forward closed
kubectl port-forward svc/webapp-light-en -n webapps 3000:80 &
PID=$!
echo "Port-forward PID: $PID"
```

Now open [http://localhost:3000](http://localhost:3000) in your browser or run `curl http://localhost:3000` to see the response in a terminal.
The browser should display a dark theme web application:

![WebApp Dark Theme](/assets/dark.png)

Now that we've successfully updated a WebApp, commit your changes:

```bash
git add webapp-dark-es.yaml && git commit -m "Update WebApp resource for dark mode in spanish"
```

**How updating works**  

1. When you apply the changed WebApp, Kubernetes sends an UPDATE event
2. Our operator's controller (in `index.ts`) detects this via the `onUpdate` handler
3. The updated spec is validated and then queued for reconciliation
4. The reconciler compares the current resources with what's needed for the new spec
5. It updates the ConfigMap with the new theme and language content
6. The Deployment automatically detects the ConfigMap change and restarts the pod with the new content

### Cleanup

When you're done testing, you can delete your WebApp and verify that all owned resources are removed:

```bash
kill $PID && # Close port-forward
kubectl delete wa -n webapps --all && 
sleep 5 &&
kubectl get cm,deploy,svc -n webapps
```

You can also delete the entire test cluster when you're finished:

```bash
k3d cluster delete pepr-dev
```

## Congratulations

You've successfully built a Kubernetes operator using Pepr. Through this tutorial, you:

1. Created a custom resource definition (CRD) for WebApps
2. Implemented a controller with reconciliation logic
3. Added validation for your custom resources
4. Deployed your operator to a Kubernetes cluster
5. Verified that your operator correctly manages the lifecycle of WebApp resources

This pattern is powerful for creating self-managing applications in Kubernetes. Your operator now handles the complex task of maintaining your application's state according to your specifications, reducing the need for manual intervention.

### What You've Learned

By completing this tutorial, you've gained experience with several important concepts:

- **Custom Resource Definitions (CRDs)**: You defined a structured, validated schema for your WebApp resources
- **Reconciliation**: You implemented the core operator pattern that maintains desired state
- **Owner References**: You used Kubernetes ownership to manage resource lifecycles
- **Status Reporting**: Your operator provides feedback about resource state through status fields
- **Watch Patterns**: Your operator reacts to changes in both custom and standard Kubernetes resources

These concepts form the foundation of the operator pattern and can be applied to manage any application or service on Kubernetes.

### Next Steps

Now that you understand the basics of building an operator with Pepr, you might want to:

- Add more sophisticated validation logic
- Implement status conditions that provide detailed health information
- Add support for upgrading between versions of your application
- Explore more complex reconciliation patterns for multi-component applications
- Add metrics and monitoring to your operator

For more information, check out:

- [Pepr Documentation](https://docs.pepr.dev)
- [Kubernetes Operator Best Practices](https://kubernetes.io/docs/concepts/extend-kubernetes/operator/)
- [Custom Resource Definition Documentation](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)

[Back to top](#building-a-kubernetes-operator-with-pepr)