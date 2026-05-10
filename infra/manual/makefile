# Manual cluster bootstrap.
#
# Run from repo root:  make -f infra/manual/makefile <target>
# Or `cd infra/manual && make <target>`.
#
# Targets are idempotent — re-running them upgrades existing releases.

.DEFAULT_GOAL := help

CLUSTER       := scg-asgn-eks-mandatory-np
REGION        := ap-southeast-1
ACCOUNT_ID    := 340741165554
ACCOUNT_USER  := arn:aws:iam::$(ACCOUNT_ID):user/admin
HELM_DIR      := $(dir $(lastword $(MAKEFILE_LIST)))helm
IAM_DIR       := $(dir $(lastword $(MAKEFILE_LIST)))iam
STORAGE_DIR   := $(dir $(lastword $(MAKEFILE_LIST)))storage

# Loki on S3 via IRSA
LOKI_BUCKET   := scg-asgn-loki-$(ACCOUNT_ID)
LOKI_ROLE     := scg-asgn-loki-s3
LOKI_NS       := logging
LOKI_SA       := loki

# AWS Load Balancer Controller
# (tag for upstream IAM policy + chart compatibility — keep on its own line,
#  Make includes trailing whitespace before inline comments in the value)
AWS_LBC_ROLE    := scg-asgn-aws-lbc
AWS_LBC_POLICY  := AWSLoadBalancerControllerIAMPolicy
AWS_LBC_VERSION := v2.13.0

# ----- AWS / kubeconfig -------------------------------------------------------

.PHONY: kubeconfig
kubeconfig: ## Configure kubectl for the EKS cluster
	aws eks update-kubeconfig --region $(REGION) --name $(CLUSTER)

.PHONY: eks-grant-admin
eks-grant-admin: ## Grant cluster-admin to $(ACCOUNT_USER) via EKS access entries
	aws eks create-access-entry \
	  --cluster-name $(CLUSTER) \
	  --region $(REGION) \
	  --principal-arn $(ACCOUNT_USER) || true
	aws eks associate-access-policy \
	  --cluster-name $(CLUSTER) \
	  --region $(REGION) \
	  --principal-arn $(ACCOUNT_USER) \
	  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy \
	  --access-scope type=cluster

# ----- Helm repos -------------------------------------------------------------

.PHONY: helm-repos
helm-repos: ## Add all the helm repos used below (only updates the ones we added)
	helm repo add ingress-nginx        https://kubernetes.github.io/ingress-nginx        || true
	helm repo add argo                 https://argoproj.github.io/argo-helm               || true
	helm repo add metrics-server       https://kubernetes-sigs.github.io/metrics-server/  || true
	helm repo add prometheus-community https://prometheus-community.github.io/helm-charts || true
	helm repo add jetstack             https://charts.jetstack.io                         || true
	helm repo add grafana              https://grafana.github.io/helm-charts              || true
	helm repo add fluent               https://fluent.github.io/helm-charts               || true
	helm repo add eks                  https://aws.github.io/eks-charts                   || true
	# Only update the repos we know about — any unrelated broken third-party
	# repo (e.g. a stale `vitess` from a different project) won't break this.
	helm repo update \
	  ingress-nginx argo metrics-server prometheus-community \
	  jetstack grafana fluent eks

.PHONY: helm-repos-clean
helm-repos-clean: ## Remove every helm repo that fails to update (run if `helm repo update` errors)
	@bad=$$(helm repo update 2>&1 | grep -oE 'https://[^ ]+' | head -1) ; \
	if [ -n "$$bad" ]; then \
	  name=$$(helm repo list -o json | jq -r ".[] | select(.url == \"$$bad\") | .name") ; \
	  echo "Removing broken repo: $$name ($$bad)" ; \
	  helm repo remove "$$name" ; \
	else \
	  echo "All helm repos updating cleanly." ; \
	fi

# ----- Required addons --------------------------------------------------------

.PHONY: install-metrics-server
install-metrics-server: helm-repos ## HPA + `kubectl top`
	helm upgrade --install metrics-server metrics-server/metrics-server \
	  --namespace kube-system \
	  -f $(HELM_DIR)/metrics-server.yaml \
	  --wait

.PHONY: install-nginx-ingress
install-nginx-ingress: helm-repos ## NGINX Ingress controller (NLB-fronted)
	helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
	  --namespace ingress-nginx --create-namespace \
	  -f $(HELM_DIR)/nginx-ingress.yaml \
	  --wait --timeout 5m

.PHONY: install-argo-rollouts
install-argo-rollouts: helm-repos ## Argo Rollouts controller (required for blue/green)
	helm upgrade --install argo-rollouts argo/argo-rollouts \
	  --namespace argo-rollouts --create-namespace \
	  -f $(HELM_DIR)/argo-rollouts.yaml \
	  --wait

.PHONY: install-argocd
install-argocd: helm-repos ## Argo CD (GitOps controller)
	helm upgrade --install argocd argo/argo-cd \
	  --namespace argocd --create-namespace \
	  -f $(HELM_DIR)/argocd.yaml \
	  --wait --timeout 10m

.PHONY: install-cert-manager
install-cert-manager: helm-repos ## cert-manager + Let's Encrypt ClusterIssuers
	helm upgrade --install cert-manager jetstack/cert-manager \
	  --namespace cert-manager --create-namespace \
	  -f $(HELM_DIR)/cert-manager.yaml \
	  --wait --timeout 5m
	@echo
	@echo "Edit the email in cert-manager-clusterissuer.yaml then apply:"
	@echo "  kubectl apply -f $(HELM_DIR)/cert-manager-clusterissuer.yaml"

# ----- Optional addons --------------------------------------------------------

.PHONY: install-kube-prom
install-kube-prom: helm-repos ## Prometheus + Grafana + Alertmanager (optional, needed for staging/prod analysis)
	helm upgrade --install kube-prom prometheus-community/kube-prometheus-stack \
	  --namespace monitoring --create-namespace \
	  -f $(HELM_DIR)/kube-prometheus-stack.yaml \
	  --wait --timeout 10m

.PHONY: eks-oidc-register
eks-oidc-register: ## Register EKS cluster's OIDC provider in IAM (one-time, prerequisite for any IRSA)
	@OIDC_ISSUER=$$(aws eks describe-cluster --name $(CLUSTER) --region $(REGION) \
	  --query 'cluster.identity.oidc.issuer' --output text | sed 's|https://||') ; \
	echo "OIDC issuer: $$OIDC_ISSUER" ; \
	if aws iam list-open-id-connect-providers --output text | grep -q $$OIDC_ISSUER ; then \
	  echo "Already registered." ; \
	else \
	  aws iam create-open-id-connect-provider \
	    --url https://$$OIDC_ISSUER \
	    --client-id-list sts.amazonaws.com \
	    --thumbprint-list 9e99a48a9960b14926bb7f3b02e22da2b0ab7280 ; \
	fi

.PHONY: create-gp3-sc
create-gp3-sc: ## Apply the gp3 StorageClass (EBS CSI driver, encrypted, default)
	kubectl apply -f $(STORAGE_DIR)/gp3-storageclass.yaml
	@echo
	@echo "Verify:  kubectl get sc"

.PHONY: create-loki-s3
create-loki-s3: ## Create the S3 bucket Loki uses for chunks
	aws s3api create-bucket \
	  --bucket $(LOKI_BUCKET) \
	  --region $(REGION) \
	  --create-bucket-configuration LocationConstraint=$(REGION) || true
	aws s3api put-bucket-versioning \
	  --bucket $(LOKI_BUCKET) \
	  --versioning-configuration Status=Enabled
	aws s3api put-public-access-block \
	  --bucket $(LOKI_BUCKET) \
	  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
	@echo "Bucket: s3://$(LOKI_BUCKET)"

.PHONY: create-loki-iam
create-loki-iam: ## Create IAM role + IRSA trust for the loki service account
	@OIDC_ISSUER=$$(aws eks describe-cluster --name $(CLUSTER) --region $(REGION) \
	   --query 'cluster.identity.oidc.issuer' --output text | sed 's|https://||') ; \
	 if [ -z "$$OIDC_ISSUER" ] || [ "$$OIDC_ISSUER" = "None" ]; then echo "Could not read OIDC issuer"; exit 1; fi ; \
	 echo "OIDC issuer: $$OIDC_ISSUER" ; \
	 sed -e "s|__OIDC_ISSUER__|$$OIDC_ISSUER|g" \
	     -e "s|__ACCOUNT_ID__|$(ACCOUNT_ID)|g" \
	     -e "s|__LOKI_NS__|$(LOKI_NS)|g" \
	     -e "s|__LOKI_SA__|$(LOKI_SA)|g" \
	     $(IAM_DIR)/loki-trust.json.tpl > /tmp/loki-trust.json ; \
	 sed -e "s|__LOKI_BUCKET__|$(LOKI_BUCKET)|g" \
	     $(IAM_DIR)/loki-policy.json.tpl > /tmp/loki-policy.json ; \
	 aws iam create-role --role-name $(LOKI_ROLE) \
	   --assume-role-policy-document file:///tmp/loki-trust.json 2>/dev/null \
	   || aws iam update-assume-role-policy --role-name $(LOKI_ROLE) \
	      --policy-document file:///tmp/loki-trust.json ; \
	 aws iam put-role-policy --role-name $(LOKI_ROLE) \
	   --policy-name loki-s3 --policy-document file:///tmp/loki-policy.json ; \
	 echo ; \
	 echo "Role ARN: arn:aws:iam::$(ACCOUNT_ID):role/$(LOKI_ROLE)" ; \
	 echo "Already wired into infra/manual/helm/loki.yaml under serviceAccount.annotations."

.PHONY: install-loki
install-loki: helm-repos ## Loki (single-binary, S3 chunks via IRSA)
	helm upgrade --install loki grafana/loki \
	  --namespace logging --create-namespace \
	  -f $(HELM_DIR)/loki.yaml \
	  --wait --timeout 10m

.PHONY: create-aws-lbc-iam
create-aws-lbc-iam: ## IAM role + IRSA for AWS Load Balancer Controller
	@OIDC_ISSUER=$$(aws eks describe-cluster --name $(CLUSTER) --region $(REGION) \
	   --query 'cluster.identity.oidc.issuer' --output text | sed 's|https://||') ; \
	 if [ -z "$$OIDC_ISSUER" ] || [ "$$OIDC_ISSUER" = "None" ]; then echo "Could not read OIDC issuer"; exit 1; fi ; \
	 echo "OIDC issuer: $$OIDC_ISSUER" ; \
	 POLICY_ARN=arn:aws:iam::$(ACCOUNT_ID):policy/$(AWS_LBC_POLICY) ; \
	 echo "Downloading upstream IAM policy ($(AWS_LBC_VERSION))..." ; \
	 curl -fsSL -o /tmp/aws-lbc-policy.json \
	   https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/$(AWS_LBC_VERSION)/docs/install/iam_policy.json ; \
	 if [ ! -s /tmp/aws-lbc-policy.json ]; then echo "Empty policy file — bad AWS_LBC_VERSION?"; exit 1; fi ; \
	 sed -e "s|__OIDC_ISSUER__|$$OIDC_ISSUER|g" \
	     -e "s|__ACCOUNT_ID__|$(ACCOUNT_ID)|g" \
	     $(IAM_DIR)/aws-lbc-trust.json.tpl > /tmp/aws-lbc-trust.json ; \
	 if aws iam create-policy --policy-name $(AWS_LBC_POLICY) \
	      --policy-document file:///tmp/aws-lbc-policy.json 2>/dev/null ; then \
	   echo "Created policy $$POLICY_ARN" ; \
	 else \
	   echo "Policy exists — pruning non-default versions before creating a new one..." ; \
	   for v in $$(aws iam list-policy-versions --policy-arn $$POLICY_ARN \
	       --query 'Versions[?!IsDefaultVersion].VersionId' --output text) ; do \
	     echo "  delete version $$v" ; \
	     aws iam delete-policy-version --policy-arn $$POLICY_ARN --version-id $$v ; \
	   done ; \
	   aws iam create-policy-version --policy-arn $$POLICY_ARN \
	     --policy-document file:///tmp/aws-lbc-policy.json --set-as-default ; \
	 fi ; \
	 aws iam create-role --role-name $(AWS_LBC_ROLE) \
	   --assume-role-policy-document file:///tmp/aws-lbc-trust.json 2>/dev/null \
	   || aws iam update-assume-role-policy --role-name $(AWS_LBC_ROLE) \
	      --policy-document file:///tmp/aws-lbc-trust.json ; \
	 aws iam attach-role-policy --role-name $(AWS_LBC_ROLE) \
	   --policy-arn $$POLICY_ARN ; \
	 echo ; \
	 echo "Role ARN: arn:aws:iam::$(ACCOUNT_ID):role/$(AWS_LBC_ROLE)" ; \
	 echo "Policy:   $$POLICY_ARN (default version updated)"

.PHONY: lbc-test
lbc-test: ## Apply the AWS LBC smoke test (single nginx LoadBalancer Service)
	kubectl apply -f $(dir $(lastword $(MAKEFILE_LIST)))test/lbc-smoke-test.yaml
	@echo
	@echo "Watch:  kubectl get svc lbc-test -w"
	@echo "Logs:   kubectl -n kube-system logs -l app.kubernetes.io/name=aws-load-balancer-controller --tail=40 -f"
	@echo "Delete: make lbc-test-clean"

.PHONY: lbc-test-clean
lbc-test-clean: ## Tear down the smoke test
	kubectl delete -f $(dir $(lastword $(MAKEFILE_LIST)))test/lbc-smoke-test.yaml --ignore-not-found

.PHONY: install-aws-lbc
install-aws-lbc: helm-repos eks-oidc-register create-aws-lbc-iam ## AWS Load Balancer Controller (NLB/ALB provisioner)
	@VPC_ID=$$(aws eks describe-cluster --name $(CLUSTER) --region $(REGION) \
	   --query 'cluster.resourcesVpcConfig.vpcId' --output text) ; \
	 if [ -z "$$VPC_ID" ] || [ "$$VPC_ID" = "None" ]; then echo "Could not read VPC ID"; exit 1; fi ; \
	 echo "VPC ID: $$VPC_ID" ; \
	 helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
	   --namespace kube-system \
	   -f $(HELM_DIR)/aws-load-balancer-controller.yaml \
	   --set clusterName=$(CLUSTER) \
	   --set region=$(REGION) \
	   --set vpcId=$$VPC_ID \
	   --set "serviceAccount.annotations.eks\.amazonaws\.com/role-arn=arn:aws:iam::$(ACCOUNT_ID):role/$(AWS_LBC_ROLE)" \
	   --wait --timeout 5m
	@echo
	@echo "AWS LBC installed. Use loadBalancerClass: service.k8s.aws/nlb in Service specs."

.PHONY: install-fluent-bit
install-fluent-bit: helm-repos ## Fluent Bit DaemonSet — ships container logs to Loki
	helm upgrade --install fluent-bit fluent/fluent-bit \
	  --namespace logging --create-namespace \
	  -f $(HELM_DIR)/fluent-bit.yaml \
	  --wait --timeout 5m

.PHONY: install-logging
install-logging: eks-oidc-register create-loki-s3 create-loki-iam install-loki install-fluent-bit ## Full logging stack: S3 + IAM + Loki + Fluent Bit
	@echo
	@echo "Logs are flowing to Loki via S3. Wire it into Grafana:"
	@echo "  Grafana → Connections → Add data source → Loki"
	@echo "  URL: http://loki.logging.svc.cluster.local:3100"

# ----- Bootstrap GitOps -------------------------------------------------------

.PHONY: gitops-bootstrap
gitops-bootstrap: ## Apply the root Argo CD Application (app-of-apps)
	kubectl apply -n argocd -f ../../argocd/bootstrap/root-app.yaml

# ----- One-shot full install --------------------------------------------------

.PHONY: install-all
install-all: helm-repos install-metrics-server install-nginx-ingress install-argo-rollouts install-argocd ## Required cluster prep (skip kube-prom + cert-manager)
	@echo
	@echo "Required addons installed. Next:"
	@echo "  1. Replace <OWNER> in argocd/{bootstrap,managed}/*.yaml"
	@echo "  2. make -f infra/manual/makefile gitops-bootstrap"
	@echo "  3. Optional: make install-kube-prom    (needed for staging/prod analysis)"
	@echo "  4. Optional: make install-cert-manager (HTTPS via Let's Encrypt)"
	@echo "  5. Optional: make install-logging      (Loki + Fluent Bit)"

# ----- Status / cleanup -------------------------------------------------------

.PHONY: status
status: ## Show release + addon health
	@echo "=== helm releases ==="
	helm list -A
	@echo
	@echo "=== addon pods ==="
	kubectl get pods -n kube-system    -l app.kubernetes.io/name=metrics-server   2>/dev/null || true
	kubectl get pods -n ingress-nginx  -l app.kubernetes.io/name=ingress-nginx    2>/dev/null || true
	kubectl get pods -n argo-rollouts                                             2>/dev/null || true
	kubectl get pods -n argocd                                                    2>/dev/null || true
	kubectl get pods -n monitoring                                                2>/dev/null || true

.PHONY: argocd-password
argocd-password: ## Print the bootstrap admin password
	@kubectl -n argocd get secret argocd-initial-admin-secret \
	  -o jsonpath='{.data.password}' | base64 -d; echo

.PHONY: argocd-port-forward
argocd-port-forward: ## Open https://localhost:8443 to reach the Argo CD UI
	kubectl -n argocd port-forward svc/argocd-server 8443:443

.PHONY: uninstall-all
uninstall-all: ## Remove every helm release installed above (keeps namespaces)
	-helm uninstall argocd        -n argocd
	-helm uninstall argo-rollouts -n argo-rollouts
	-helm uninstall ingress-nginx -n ingress-nginx
	-helm uninstall metrics-server -n kube-system
	-helm uninstall kube-prom     -n monitoring
	-helm uninstall cert-manager  -n cert-manager
	-helm uninstall fluent-bit    -n logging
	-helm uninstall loki          -n logging
	-helm uninstall aws-load-balancer-controller -n kube-system

# ----- Help -------------------------------------------------------------------

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_%-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2}'
