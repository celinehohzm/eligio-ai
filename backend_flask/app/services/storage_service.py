import os

from azure.storage.blob import BlobServiceClient


class StorageService:
    """Storage abstraction for local disk and Azure Blob Storage."""

    def __init__(self, config):
        self.provider = config.get("STORAGE_PROVIDER", "local")
        self.local_root = config.get("UPLOAD_FOLDER", "uploads")
        self.container_name = config.get("AZURE_STORAGE_CONTAINER", "uploads")
        self.blob_service_client = None
        self.container_client = None

        if self.provider == "azure":
            connection_string = config.get("AZURE_STORAGE_CONNECTION_STRING")
            if not connection_string:
                raise ValueError("AZURE_STORAGE_CONNECTION_STRING is required when STORAGE_PROVIDER=azure")

            self.blob_service_client = BlobServiceClient.from_connection_string(connection_string)
            self.container_client = self.blob_service_client.get_container_client(self.container_name)
            if not self.container_client.exists():
                self.container_client.create_container()

    def save_file(self, file_storage, relative_path, content_type=None):
        if self.provider == "azure":
            blob_name = relative_path.replace("\\", "/")
            blob_client = self.container_client.get_blob_client(blob_name)
            file_storage.stream.seek(0)
            blob_client.upload_blob(
                file_storage.stream,
                overwrite=True,
                content_type=content_type,
            )
            return {
                "provider": "azure",
                "storage_key": blob_name,
                "file_path": blob_client.url,
            }

        local_path = os.path.join(self.local_root, relative_path)
        local_dir = os.path.dirname(local_path)
        if local_dir and not os.path.exists(local_dir):
            os.makedirs(local_dir, exist_ok=True)
        file_storage.save(local_path)
        return {
            "provider": "local",
            "storage_key": local_path,
            "file_path": local_path,
        }

    def delete_file(self, storage_key):
        if not storage_key:
            return

        if self.provider == "azure":
            try:
                self.container_client.delete_blob(storage_key)
            except Exception:
                pass
            return

        if os.path.exists(storage_key):
            try:
                os.remove(storage_key)
            except Exception:
                pass
