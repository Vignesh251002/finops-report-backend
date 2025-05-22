echo "Starting the Deployment of finops backend"
REGION=ap-south-1
STAGE=dev
STACK_NAME=${STAGE}-finOps-backend-pipeline
BUCKET=plant365-devops-resources
sam deploy -t codepipeline.yaml --capabilities CAPABILITY_NAMED_IAM  \
    --stack-name ${STACK_NAME} --region=${REGION}  --s3-bucket=${BUCKET} \
    --parameter-overrides \
        "ParameterKey=Environment,ParameterValue=${STAGE}" \ 
        "ParameterKey=Region,ParameterValue=${REGION}"
