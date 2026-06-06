terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# CloudFront viewer certificates must live in us-east-1, regardless of the
# stack's primary region. Used only for the frontend custom-domain cert.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
