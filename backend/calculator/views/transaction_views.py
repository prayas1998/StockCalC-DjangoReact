from django.http import JsonResponse
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.conf import settings

from ..models import TransactionRecord, TransactionGroup
from ..serializers import (
    TransactionRecordSerializer, 
    TransactionGroupSerializer,
    TransactionGroupCreateSerializer
)

def test_api(request):
    return JsonResponse({"status": "success", "message": "Test API is working!"})

class TransactionRecordViewSet(viewsets.ModelViewSet):
    """
    API endpoint for individual transaction records
    """
    queryset = TransactionRecord.objects.all().order_by('-created_at')
    serializer_class = TransactionRecordSerializer
    permission_classes = [permissions.IsAuthenticated]  # Add this line
    
    def get_queryset(self):
        """
        Filter records to return only the user's own records
        """
        user = self.request.user
        # This should ALWAYS filter by the current user
        return TransactionRecord.objects.filter(user=user).order_by('-created_at')
    
    def perform_create(self, serializer):
        """
        Associate the current authenticated user with the transaction
        """
        serializer.save(user=self.request.user)


class TransactionGroupViewSet(viewsets.ModelViewSet):
    """
    API endpoint for transaction groups
    """
    queryset = TransactionGroup.objects.all().order_by('-created_at')
    serializer_class = TransactionGroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter groups to return only the user's own groups
        Also supports search by title
        """
        user = self.request.user
        # Always filter by the current user - no exceptions
        queryset = TransactionGroup.objects.filter(user=user).order_by('-created_at')
        
        # Apply search filter if provided
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(title__icontains=search_query)
            
        return queryset
    
    def perform_create(self, serializer):
        """
        Associate the current authenticated user with the group
        """
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def update_summary(self, request, pk=None):
        """
        Recalculate the group summary based on its transactions
        """
        group = self.get_object()
        group.update_summary()
        return Response({'status': 'summary updated'})


class SaveCalculationAPIView(APIView):
    """
    API endpoint to save calculation results to database
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        # Include the user in the serializer context
        serializer = TransactionGroupCreateSerializer(
            data=request.data, 
            context={'request': request}
        )
        
        if serializer.is_valid():
            # Save explicitly associates with the current user
            group = serializer.save(user=request.user)
            
            return Response(
                TransactionGroupSerializer(group).data, 
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)