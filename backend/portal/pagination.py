from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination class that allows clients to specify `page_size`
    via query parameter up to `max_page_size` (1000).
    If `page_size=all`, `0`, or `-1`, pagination is bypassed and all records are returned.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 1000

    def paginate_queryset(self, queryset, request, view=None):
        page_size = request.query_params.get(self.page_size_query_param)
        if page_size in ('all', '0', '-1'):
            return None
        return super().paginate_queryset(queryset, request, view)
