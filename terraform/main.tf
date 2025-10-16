terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

variable "region" { default = "us-east-1" }

# Skeleton resources - fill in before production
resource "aws_s3_bucket" "assets" {
  bucket = var.assets_bucket
}

variable "assets_bucket" { default = "auralforge-assets-dev" }
