{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::__ACCOUNT_ID__:oidc-provider/__OIDC_ISSUER__"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "__OIDC_ISSUER__:aud": "sts.amazonaws.com",
          "__OIDC_ISSUER__:sub": "system:serviceaccount:kube-system:aws-load-balancer-controller"
        }
      }
    }
  ]
}
