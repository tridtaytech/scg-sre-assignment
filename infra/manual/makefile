# Manual cluster bootstrap.
#
# Run from repo root:  make -f infra/manual/makefile <target>
# Or `cd infra/manual && make <target>`.
#
# Targets are idempotent — re-running them upgrades existing releases.

.DEFAULT_GOAL := help

CLUSTER       := scg-asgn-eks-mandatory-np
REGION        := ap-southeast-1
ACCOUNT_USER  := arn:aws:iam::340741165554:user/admin
HELM_DIR      := $(dir $(lastword $(MAKEFILE_LIST)))helm

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
helm-repos: ## Add all the helm repos used below
	helm repo add ingress-nginx        https://kubernetes.github.io/ingress-nginx        || true
	helm repo add argo                 https://argoproj.github.io/argo-helm               || true
	helm repo add metrics-server       https://kubernetes-sigs.github.io/metrics-server/  || true
	helm repo add prometheus-community https://prometheus-community.github.io/helm-charts || true
	helm repo update

# ----- Required addons --------------------------------------------------------

.PHONY: install-metrics-server
install-metrics-server: ## HPA + `kubectl top`
	helm upgrade --install metrics-server metrics-server/metrics-server \
	  --namespace kube-system \
	  -f $(HELM_DIR)/metrics-server.yaml \
	  --wait

.PHONY: install-nginx-ingress
install-nginx-ingress: ## NGINX Ingress controller (NLB-fronted)
	helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
	  --namespace ingress-nginx --create-namespace \
	  -f $(HELM_DIR)/nginx-ingress.yaml \
	  --wait --timeout 5m

.PHONY: install-argo-rollouts
install-argo-rollouts: ## Argo Rollouts controller (required for blue/green)
	helm upgrade --install argo-rollouts argo/argo-rollouts \
	  --namespace argo-rollouts --create-namespace \
	  -f $(HELM_DIR)/argo-rollouts.yaml \
	  --wait

.PHONY: install-argocd
install-argocd: ## Argo CD (GitOps controller)
	helm upgrade --install argocd argo/argo-cd \
	  --namespace argocd --create-namespace \
	  -f $(HELM_DIR)/argocd.yaml \
	  --wait --timeout 10m

# ----- Optional addons --------------------------------------------------------

.PHONY: install-kube-prom
install-kube-prom: ## Prometheus + Grafana + Alertmanager (optional, needed for staging/prod analysis)
	helm upgrade --install kube-prom prometheus-community/kube-prometheus-stack \
	  --namespace monitoring --create-namespace \
	  -f $(HELM_DIR)/kube-prometheus-stack.yaml \
	  --wait --timeout 10m

# ----- Bootstrap GitOps -------------------------------------------------------

.PHONY: gitops-bootstrap
gitops-bootstrap: ## Apply the root Argo CD Application (app-of-apps)
	kubectl apply -n argocd -f ../../argocd/bootstrap/root-app.yaml

# ----- One-shot full install --------------------------------------------------

.PHONY: install-all
install-all: helm-repos install-metrics-server install-nginx-ingress install-argo-rollouts install-argocd ## Required cluster prep (skip kube-prom)
	@echo
	@echo "Required addons installed. Next:"
	@echo "  1. Replace <OWNER> in argocd/{bootstrap,managed}/*.yaml"
	@echo "  2. make -f infra/manual/makefile gitops-bootstrap"
	@echo "  3. Optional: make install-kube-prom (needed for staging/prod analysis)"

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
	-helm uninstall argocd -n argocd
	-helm uninstall argo-rollouts -n argo-rollouts
	-helm uninstall ingress-nginx -n ingress-nginx
	-helm uninstall metrics-server -n kube-system
	-helm uninstall kube-prom -n monitoring

# ----- Help -------------------------------------------------------------------

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_%-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2}'
