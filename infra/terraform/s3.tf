resource "aws_s3_bucket" "web" {
  bucket = "${local.name_prefix}-web-${data.aws_caller_identity.current.account_id}"

  tags = { Name = "${local.name_prefix}-web" }
}

resource "aws_s3_bucket" "media" {
  bucket = "${local.name_prefix}-media-${data.aws_caller_identity.current.account_id}"

  tags = { Name = "${local.name_prefix}-media" }
}

resource "aws_s3_bucket_public_access_block" "web" {
  bucket = aws_s3_bucket.web.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "web" {
  bucket = aws_s3_bucket.web.id
  versioning_configuration { status = "Enabled" }
}
