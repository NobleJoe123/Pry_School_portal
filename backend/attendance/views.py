from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import StudentAttendance, TeacherAttendance
from .serializers import StudentAttendanceSerializer, TeacherAttendanceSerializer

class StudentAttendanceViewSet(viewsets.ModelViewSet):
    queryset = StudentAttendance.objects.all()
    serializer_class = StudentAttendanceSerializer
    permission_classes = [IsAuthenticated]

class TeacherAttendanceViewSet(viewsets.ModelViewSet):
    queryset = TeacherAttendance.objects.all()
    serializer_class = TeacherAttendanceSerializer
    permission_classes = [IsAuthenticated]
