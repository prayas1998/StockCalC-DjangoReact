from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..rate_limiting import general_rate_limit

@api_view(['GET'])
@general_rate_limit
def health_check(request):
    """
    Simple health check endpoint to verify API connectivity
    """
    return Response({
        "status": "ok",
        "message": "API is operational",
        "version": "1.0.0"
    })