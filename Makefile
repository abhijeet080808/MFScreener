FLAGS = -pedantic -Wall -Wextra -std=c++11

all: downloader.cc
	g++ -s -O3 -o downloader downloader.cc $(FLAGS) -I /usr/local/include/boost/ -lboost_date_time

debug: downloader.cc
	g++ -g -O3 -o downloader downloader.cc  $(FLAGS) -I /usr/local/include/boost/ -lboost_date_time

clean:
	rm -f downloader
