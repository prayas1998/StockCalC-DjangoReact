from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def health_check(request):
    """
    Simple health check endpoint to verify API connectivity
    """
    return Response({
        "status": "ok",
        "message": "API is operational",
        "version": "1.0.0"
    })