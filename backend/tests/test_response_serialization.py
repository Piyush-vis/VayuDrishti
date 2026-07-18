"""
Regression test for a class of bug that slipped past the in-memory mock database and
only surfaced against a real MongoDB: motor's insert_one() mutates the document you
pass it, adding a raw (non-JSON-serializable) ObjectId as "_id". Two service functions
(prediction.get_forecast_for_station, attribution.get_attribution_for_zone) returned
that same mutated dict directly, causing FastAPI's jsonable_encoder to raise
ValueError("'ObjectId' object is not iterable") - a 500 that only appeared once a real
MongoDB container was actually running (the mock's insert_one deep-copies before
inserting, so it never mutated the caller's dict).

These tests swap in a fake collection that mimics motor's real mutate-in-place
behavior for exactly the collections these two functions write to, while leaving
everything else on the normal in-memory mock, so the test reproduces the real bug
condition without needing an actual MongoDB.
"""
import asyncio

from bson import ObjectId
from fastapi.encoders import jsonable_encoder

from backend.models.database import db_helper, seed_database


class MutatingCollection:
    """Mimics real motor/pymongo insert_one, which mutates the passed-in document by
    adding a raw ObjectId as "_id" - unlike MockCollection, which deep-copies first."""

    async def insert_one(self, document):
        document["_id"] = ObjectId()

        class _Result:
            inserted_id = document["_id"]

        return _Result()


def _assert_json_serializable(payload):
    # This is the exact function FastAPI calls on every response before returning it -
    # calling it directly reproduces the real ValueError("'ObjectId' object is not
    # iterable") that only appeared in production against a real MongoDB.
    jsonable_encoder(payload)


def test_forecast_payload_is_json_serializable_with_mutating_insert():
    async def run():
        await seed_database()
        db_helper.predictions = MutatingCollection()

        from backend.services.prediction import prediction_service
        cursor = db_helper.stations.find({"active": True})
        stations = await cursor.to_list(length=1)
        assert stations, "expected at least one seeded station"

        result = await prediction_service.get_forecast_for_station(stations[0]["station_id"], hours=6)
        assert "_id" not in result
        _assert_json_serializable(result)

    asyncio.run(run())


def test_attribution_payload_is_json_serializable_with_mutating_insert():
    async def run():
        await seed_database()
        db_helper.source_attributions = MutatingCollection()

        from backend.services.attribution import attribution_service
        cursor = db_helper.stations.find({"active": True})
        stations = await cursor.to_list(length=1)
        assert stations, "expected at least one seeded station"

        result = await attribution_service.get_attribution_for_zone(
            stations[0]["city"], stations[0]["zone"]
        )
        assert "_id" not in result
        _assert_json_serializable(result)

    asyncio.run(run())
