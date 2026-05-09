package com.scg.asgn.api;

import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class ItemService {

    private final ConcurrentMap<String, Item> store = new ConcurrentHashMap<>();
    private final Clock clock;

    public ItemService(Clock clock) {
        this.clock = clock;
    }

    public Item create(String name) {
        Item item = new Item(UUID.randomUUID().toString(), name, clock.instant());
        store.put(item.id(), item);
        return item;
    }

    public Collection<Item> list() {
        return store.values();
    }

    public Optional<Item> get(String id) {
        return Optional.ofNullable(store.get(id));
    }

    public boolean delete(String id) {
        return store.remove(id) != null;
    }
}
